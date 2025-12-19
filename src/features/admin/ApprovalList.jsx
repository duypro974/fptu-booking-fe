import { useEffect, useState, useMemo } from "react";
import { Check, X, Clock, Calendar, User, Building2, AlertCircle, Info, Users, Search, Plus, Eye } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import AdminLayout, { AdminHeader, AdminContent } from "../../components/layout/AdminLayout";
import BookingActionModal from "./BookingActionModal";
import BookingDetailModal from "./BookingDetailModal";
import { toDateISO_Local } from "../../lib/utils";
import { getAllBookings } from "../../services/bookingService";

export default function ApprovalList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // "all" hoặc tên loại phòng
  const [facilityTypes, setFacilityTypes] = useState([]); // Danh sách tất cả loại phòng từ API
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [conflictCount, setConflictCount] = useState(0);
  const [conflictList, setConflictList] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedNewRoom, setSelectedNewRoom] = useState(null);
  const [loadingAvailableRooms, setLoadingAvailableRooms] = useState(false);
  const [roomStatus, setRoomStatus] = useState(null); // 'active', 'maintenance', 'inactive'
  const [isRoomMaintenance, setIsRoomMaintenance] = useState(false);
  const [isRoomInactive, setIsRoomInactive] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false); // Track xem có đang dùng fallback không
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedBookingData, setSelectedBookingData] = useState(null);
  const [activeTab, setActiveTab] = useState('SINGLE_PENDING'); // 'SINGLE_PENDING' | 'RECURRING_PENDING' | 'RECURRING_ACTIVE'

  // Chỉ Facility Admin mới có quyền chuyển phòng
  const isFacilityAdmin = user?.role === 'facility_admin' || user?.role === 'FACILITY_ADMIN';

  // Helper function to check if a booking is RECURRING
  // Detection via Data Structure (NOT bookingType):
  // - Has bookingGroupId (child slot) OR has bookings array with length > 0 (parent group)
  const isRecurringBooking = (booking) => {
    const hasBookingGroupId = booking.bookingGroupId !== null && booking.bookingGroupId !== undefined;
    const hasBookingsArray = Array.isArray(booking.bookings) && booking.bookings.length > 0;
    
    return hasBookingGroupId || hasBookingsArray;
  };
  
  // Helper function to resolve Parent ID for modal
  // If item has bookingGroupId -> use bookingGroupId (parent), else use item.id
  const resolveParentId = (item) => {
    if (item.bookingGroupId !== null && item.bookingGroupId !== undefined) {
      return item.bookingGroupId;
    }
    return item.id;
  };

  useEffect(() => {
    console.log("[ApprovalList] useEffect triggered, user:", user);
    console.log("[ApprovalList] user?.campus:", user?.campus);
    console.log("[ApprovalList] user?.campusId:", user?.campusId);
    
    // Load danh sách loại phòng từ API
    loadFacilityTypes();
    
    // Nếu user có campus hoặc campusId, load data
    if (user?.campus || user?.campusId) {
      console.log("[ApprovalList] Loading data...");
      loadRequests();
    } else {
      console.warn("[ApprovalList] User không có campus hoặc campusId, không thể load data");
      setLoading(false);
    }
  }, [user]);

  const loadFacilityTypes = async () => {
    try {
      const types = await api.getFacilityTypes();
      setFacilityTypes(Array.isArray(types) ? types : []);
    } catch (error) {
      console.error("[ApprovalList] Lỗi tải danh sách loại phòng:", error);
      setFacilityTypes([]);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    console.log("[ApprovalList.loadRequests] Starting, user:", user);
    
    try {
      // Convert user.campus hoặc user.campusId sang campus
      let campus = user?.campus;
      let campusId = user?.campusId;
      
      if (!campus && campusId) {
        // Map campusId sang campus string
        const campusMap = { 1: 'hn', 2: 'hcm', 3: 'dn', 4: 'ct', 5: 'qn' };
        campus = campusMap[campusId] || 'hcm';
      }
      
      // Fallback: nếu không có campus, dùng 'hcm' làm mặc định
      if (!campus) {
        console.warn("[ApprovalList.loadRequests] Không thể xác định campus, dùng mặc định 'hcm'");
        campus = 'hcm';
        campusId = 2; // Default to HCM
      }

      if (!campusId) {
        const campusIdMap = { 'hn': 1, 'hcm': 2, 'dn': 3, 'ct': 4, 'qn': 5 };
        campusId = campusIdMap[campus] || 2;
      }

      console.log("[ApprovalList.loadRequests] Loading approvals for campus:", campus);
      
      // Load PENDING bookings
      const pendingData = await api.getPendingApprovals(campus);
      console.log("[ApprovalList.loadRequests] Received pending data:", pendingData?.length || 0, "requests");
      
      // Load ALL bookings to get APPROVED recurring bookings for RECURRING_ACTIVE tab
      let allBookingsData = [];
      try {
        allBookingsData = await getAllBookings(campusId);
        console.log("[ApprovalList.loadRequests] Received all bookings:", allBookingsData?.length || 0, "bookings");
      } catch (error) {
        console.warn("[ApprovalList.loadRequests] Error loading all bookings (may not be available):", error);
        // Continue with only pending data if getAllBookings fails
      }
      
      // Debug: Check sample of approved items from getAllBookings
      const approvedItems = (allBookingsData || []).filter(item => {
        const status = String(item.status || "").toUpperCase();
        return status === "APPROVED" || status === "APPROVED_GROUP";
      });
      console.log("[ApprovalList] Total APPROVED items from getAllBookings:", approvedItems.length);
      
      // Check if item id 23 (known recurring) is in approved items
      const item23 = approvedItems.find(item => item.id === 23);
      if (item23) {
        console.log("[ApprovalList] Item 23 (known recurring) in APPROVED:", {
          id: item23.id,
          status: item23.status,
          isGroup: item23.isGroup,
          isRecurring: item23.isRecurring,
          bookingType: item23.bookingType,
          bookingGroupId: item23.bookingGroupId,
          hasBookingsArray: Array.isArray(item23.bookings) && item23.bookings.length > 0,
          bookingsLength: item23.bookings?.length || 0,
          fullItem: item23
        });
      }
      
      // Check for items with bookingGroupId (child bookings that might be part of recurring)
      const itemsWithGroupId = approvedItems.filter(item => item.bookingGroupId !== null && item.bookingGroupId !== undefined);
      console.log("[ApprovalList] APPROVED items with bookingGroupId:", itemsWithGroupId.length);
      if (itemsWithGroupId.length > 0) {
        // Group by bookingGroupId to find parent recurring bookings
        const groupIds = [...new Set(itemsWithGroupId.map(item => item.bookingGroupId))];
        console.log("[ApprovalList] Unique bookingGroupIds in APPROVED:", groupIds);
        
        // For each group, check if there's a parent booking
        groupIds.forEach(groupId => {
          const parentBooking = allBookingsData.find(item => item.id === groupId);
          if (parentBooking) {
            console.log("[ApprovalList] Parent booking for groupId", groupId, ":", {
              id: parentBooking.id,
              status: parentBooking.status,
              isGroup: parentBooking.isGroup,
              isRecurring: parentBooking.isRecurring,
              bookingType: parentBooking.bookingType,
              hasBookingsArray: Array.isArray(parentBooking.bookings) && parentBooking.bookings.length > 0,
              bookingsLength: parentBooking.bookings?.length || 0
            });
          }
        });
      }
      
      if (approvedItems.length > 0) {
        console.log("[ApprovalList] Sample APPROVED item:", {
          id: approvedItems[0].id,
          status: approvedItems[0].status,
          isGroup: approvedItems[0].isGroup,
          isRecurring: approvedItems[0].isRecurring,
          bookingType: approvedItems[0].bookingType,
          bookingGroupId: approvedItems[0].bookingGroupId,
          hasBookingsArray: Array.isArray(approvedItems[0].bookings) && approvedItems[0].bookings.length > 0,
          bookingsLength: approvedItems[0].bookings?.length || 0
        });
      }
      
      // Merge: Use pending data as primary, add APPROVED recurring bookings from allBookings
      // Filter APPROVED items that are part of recurring (child slots with bookingGroupId)
      const approvedRecurring = (allBookingsData || []).filter(item => {
        const status = String(item.status || "").toUpperCase();
        const isApproved = status === "APPROVED";
        
        if (!isApproved) return false;
        
        // For RECURRING_ACTIVE: Only include child slots (have bookingGroupId)
        // We will group them by bookingGroupId to show one card per parent
        const hasBookingGroupId = item.bookingGroupId !== null && item.bookingGroupId !== undefined;
        
        return hasBookingGroupId;
      });
      
      console.log("[ApprovalList] Filtered approved recurring child slots:", approvedRecurring.length);
      
      // Group child slots by bookingGroupId to create parent groups
      const groupedByParent = {};
      approvedRecurring.forEach(item => {
        const groupId = item.bookingGroupId;
        if (!groupId) return;
        
        if (!groupedByParent[groupId]) {
          groupedByParent[groupId] = [];
        }
        groupedByParent[groupId].push(item);
      });
      
      console.log("[ApprovalList] Grouped into", Object.keys(groupedByParent).length, "parent groups");
      
      // Aggregate each group into a single parent booking object
      const aggregatedParents = Object.entries(groupedByParent).map(([groupId, childSlots]) => {
        // Use the first child slot as base
        const firstSlot = childSlots[0];
        
        // Calculate date range: min(startTime) to max(endTime)
        const startTimes = childSlots.map(slot => slot.startTime ? new Date(slot.startTime).getTime() : 0).filter(t => t > 0);
        const endTimes = childSlots.map(slot => slot.endTime ? new Date(slot.endTime).getTime() : 0).filter(t => t > 0);
        const minStartTime = startTimes.length > 0 ? new Date(Math.min(...startTimes)).toISOString() : null;
        const maxEndTime = endTimes.length > 0 ? new Date(Math.max(...endTimes)).toISOString() : null;
        
        // Calculate progress: Used slots (endTime < now)
        const now = new Date().getTime();
        const usedSlots = childSlots.filter(slot => {
          if (!slot.endTime) return false;
          return new Date(slot.endTime).getTime() < now;
        }).length;
        const totalSlots = childSlots.length;
        
        // Create aggregated parent object
        return {
          ...firstSlot,
          id: parseInt(groupId), // Use parent ID as the ID for the card
          bookingGroupId: parseInt(groupId),
          // Store aggregated data
          _aggregated: {
            childSlots: childSlots,
            minStartTime,
            maxEndTime,
            usedSlots,
            totalSlots
          },
          // Override startTime/endTime for display
          startTime: minStartTime,
          endTime: maxEndTime
        };
      });
      
      console.log("[ApprovalList] Aggregated parents:", aggregatedParents.length);
      
      // Combine: pending data + aggregated parent groups (avoid duplicates by ID)
      const pendingIds = new Set((pendingData || []).map(item => item.id));
      const uniqueApproved = aggregatedParents.filter(item => !pendingIds.has(item.id));
      
      const data = [...(pendingData || []), ...uniqueApproved];
      
      console.log("[ApprovalList.loadRequests] Combined data:", data.length, "requests (pending:", pendingData?.length || 0, "approved recurring:", uniqueApproved.length, ")");
      
      // Map data với flexible field mapping
      const mappedData = (data || []).map((item) => {
        // Map room name (flexible)
        const roomName = item.facilityName || 
                        item.facility?.name || 
                        item.roomName || 
                        item.facility?.facilityName ||
                        item.room?.name ||
                        "N/A";
        
        // Map user name (flexible) - xử lý cả BookingGroup và Booking đơn lẻ
        // Ưu tiên: item.user -> item.bookings[0].user (cho BookingGroup) -> fallback
        let userName = "N/A";
        if (item.user?.fullName) {
          userName = item.user.fullName;
        } else if (item.userName) {
          userName = item.userName;
        } else if (item.user?.name) {
          userName = item.user.name;
        } else if (item.requesterName) {
          userName = item.requesterName;
        } else if (item.requester?.name) {
          userName = item.requester.name;
        } else if (item.requester?.fullName) {
          userName = item.requester.fullName;
        } else if (item.bookings?.[0]?.user?.fullName) {
          // Trường hợp BookingGroup: lấy user từ booking đầu tiên
          userName = item.bookings[0].user.fullName;
        } else if (item.bookings?.[0]?.user?.name) {
          userName = item.bookings[0].user.name;
        }
        
        // Map user email (flexible) - xử lý cả BookingGroup và Booking đơn lẻ
        let userEmail = "";
        if (item.user?.email) {
          userEmail = item.user.email;
        } else if (item.userEmail) {
          userEmail = item.userEmail;
        } else if (item.requesterEmail) {
          userEmail = item.requesterEmail;
        } else if (item.requester?.email) {
          userEmail = item.requester.email;
        } else if (item.bookings?.[0]?.user?.email) {
          // Trường hợp BookingGroup: lấy email từ booking đầu tiên
          userEmail = item.bookings[0].user.email;
        }
        
        // Map date (extract từ startTime nếu không có date field)
        let date = item.date || item.bookingDate || item.startDate;
        if (!date && item.startTime) {
          const startDate = new Date(item.startTime);
          date = toDateISO_Local(startDate); // Format: YYYY-MM-DD
        } else if (!date && item.bookings?.[0]?.startTime) {
          // Trường hợp BookingGroup: lấy date từ booking đầu tiên
          const startDate = new Date(item.bookings[0].startTime);
          date = toDateISO_Local(startDate);
        }
        
        // Map startTime và endTime - xử lý cả BookingGroup và Booking đơn lẻ
        let startTime = item.startTime || item.start || item.timeStart;
        let endTime = item.endTime || item.end || item.timeEnd;
        
        // Nếu không có startTime/endTime ở top-level, thử lấy từ bookings[0] (BookingGroup)
        if (!startTime && item.bookings?.[0]?.startTime) {
          startTime = item.bookings[0].startTime;
        }
        if (!endTime && item.bookings?.[0]?.endTime) {
          endTime = item.bookings[0].endTime;
        }
        
        // Map participant count - xử lý cả BookingGroup và Booking đơn lẻ
        // Lưu ý: phải check !== undefined và !== null vì 0 cũng là giá trị hợp lệ
        let participantCount = null;
        if (item.attendeeCount !== undefined && item.attendeeCount !== null) {
          participantCount = item.attendeeCount;
        } else if (item.participantCount !== undefined && item.participantCount !== null) {
          participantCount = item.participantCount;
        } else if (item.participants !== undefined && item.participants !== null) {
          participantCount = item.participants;
        } else if (item.numberOfParticipants !== undefined && item.numberOfParticipants !== null) {
          participantCount = item.numberOfParticipants;
        } else if (item.attendees?.length !== undefined) {
          participantCount = item.attendees.length;
        } else if (item.bookings?.[0]?.attendeeCount !== undefined && item.bookings[0].attendeeCount !== null) {
          // Trường hợp BookingGroup: lấy từ booking đầu tiên
          participantCount = item.bookings[0].attendeeCount;
        } else if (item.bookings?.[0]?.participantCount !== undefined && item.bookings[0].participantCount !== null) {
          participantCount = item.bookings[0].participantCount;
        }
        
        // Map room type (flexible)
        const roomType = item.facility?.type?.name ||
                        item.facilityType?.name ||
                        item.type?.name ||
                        item.roomType ||
                        item.facility?.facilityType?.name ||
                        "Unknown";
        
        return {
          ...item,
          roomName,
          userName,
          userEmail,
          date,
          startTime,
          endTime,
          participantCount,
          roomType,
          // Preserve fields for RECURRING detection
          isGroup: item.isGroup,
          isRecurring: item.isRecurring,
          bookingType: item.bookingType,
          bookings: item.bookings,
          bookingGroupId: item.bookingGroupId,
          // Preserve aggregated data for RECURRING_ACTIVE tab
          _aggregated: item._aggregated
        };
      });
      
      // Sắp xếp theo thời gian tạo: Đơn đặt trước (createdAt cũ hơn) lên đầu
      const sortedData = mappedData.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.startTime || 0).getTime();
        const timeB = new Date(b.createdAt || b.startTime || 0).getTime();
        return timeA - timeB; // Tăng dần: đơn cũ nhất lên đầu
      });
      
      console.log("[ApprovalList.loadRequests] Mapped and sorted data:", sortedData);
      console.log("[ApprovalList.loadRequests] Sorted data:", sortedData.length, "requests");
      setRequests(sortedData);
    } catch (error) {
      console.error("[ApprovalList.loadRequests] Lỗi tải danh sách yêu cầu:", error);
      console.error("[ApprovalList.loadRequests] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setRequests([]);
    } finally {
      setLoading(false);
      console.log("[ApprovalList.loadRequests] Loading completed");
    }
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectReason("");
    setShowRejectModal(true);
  };

  // Mapping slot theo hệ thống thực tế
  const SLOT_MAPPING = {
    1: { start: 7, end: 9 },   // 07:00 - 09:00
    2: { start: 9, end: 11 },  // 09:00 - 11:00
    3: { start: 11, end: 13 }, // 11:00 - 13:00
    4: { start: 13, end: 15 }, // 13:00 - 15:00
    5: { start: 15, end: 17 }, // 15:00 - 17:00
  };

  // Hàm xác định slot từ thời gian (trả về slot đầu tiên)
  const getSlotFromTime = (timeString) => {
    const date = new Date(timeString);
    const hours = date.getHours();
    
    // Tìm slot phù hợp dựa trên giờ bắt đầu (local time)
    for (const [slotNum, range] of Object.entries(SLOT_MAPPING)) {
      if (hours >= range.start && hours < range.end) {
        return parseInt(slotNum);
      }
    }
    
    // Nếu không tìm thấy, trả về slot gần nhất
    if (hours < 7) return 1;
    if (hours >= 17) return 5;
    
    // Fallback: tính slot dựa trên khoảng cách từ 7:00
    return Math.min(5, Math.max(1, Math.floor((hours - 7) / 2) + 1));
  };

  // Hàm tính TẤT CẢ các slot mà booking trải qua
  const getSlotsFromTimeRange = (startTime, endTime) => {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const startHours = startDate.getHours();
    const endHours = endDate.getHours();
    
    const slots = [];
    
    // Tìm slot bắt đầu
    let startSlot = null;
    for (const [slotNum, range] of Object.entries(SLOT_MAPPING)) {
      if (startHours >= range.start && startHours < range.end) {
        startSlot = parseInt(slotNum);
        break;
      }
    }
    
    // Nếu không tìm thấy startSlot, tính fallback
    if (!startSlot) {
      if (startHours < 7) startSlot = 1;
      else if (startHours >= 17) startSlot = 5;
      else startSlot = Math.min(5, Math.max(1, Math.floor((startHours - 7) / 2) + 1));
    }
    
    // Tìm slot kết thúc
    // Lưu ý: Nếu endHours = range.end (ví dụ: 15:00), booking chỉ cần slot đó, không cần slot tiếp theo
    // Nhưng nếu endHours > range.start và endHours < range.end, thì cần slot đó
    // Nếu endHours = range.end và có phút > 0, thì cần slot tiếp theo
    let endSlot = null;
    const endMinutes = endDate.getMinutes();
    
    for (const [slotNum, range] of Object.entries(SLOT_MAPPING)) {
      // Nếu endHours nằm trong khoảng (range.start, range.end)
      if (endHours > range.start && endHours < range.end) {
        endSlot = parseInt(slotNum);
        break;
      }
      // Nếu endHours = range.end và endMinutes = 0, thì booking kết thúc đúng lúc slot kết thúc
      // Nên chỉ cần slot đó, không cần slot tiếp theo
      if (endHours === range.end && endMinutes === 0) {
        endSlot = parseInt(slotNum);
        break;
      }
      // Nếu endHours = range.end và endMinutes > 0, thì booking trải qua slot tiếp theo
      if (endHours === range.end && endMinutes > 0) {
        // Cần slot tiếp theo
        const nextSlot = parseInt(slotNum) + 1;
        endSlot = Math.min(5, nextSlot);
        break;
      }
    }
    
    // Nếu không tìm thấy endSlot, tính fallback
    if (!endSlot) {
      if (endHours <= 7) endSlot = 1;
      else if (endHours > 17) endSlot = 5;
      else {
        // Tính slot dựa trên endHours
        const calculatedSlot = Math.min(5, Math.max(1, Math.floor((endHours - 7) / 2) + 1));
        // Nếu endHours = range.end và có phút, cần slot tiếp theo
        const slotRange = SLOT_MAPPING[calculatedSlot];
        if (slotRange && endHours === slotRange.end && endMinutes > 0) {
          endSlot = Math.min(5, calculatedSlot + 1);
        } else {
          endSlot = calculatedSlot;
        }
      }
    }
    
    // Tạo danh sách tất cả các slot từ startSlot đến endSlot
    for (let slot = startSlot; slot <= endSlot; slot++) {
      slots.push(slot);
    }
    
    console.log("[getSlotsFromTimeRange] Input:", {
      startTime,
      endTime,
      startHours,
      endHours,
      startSlot,
      endSlot,
      slots
    });
    
    return slots;
  };

  // Hàm lấy danh sách phòng trống trong khung giờ
  // Cách xác định phòng trống:
  // 1. Tính TẤT CẢ các slot mà booking trải qua
  // 2. Gọi API /bookings/search cho TẤT CẢ các slot
  // 3. Lấy intersection (giao) của các phòng trống trong tất cả các slot
  // 4. Fallback: Lấy tất cả phòng ACTIVE (nhưng không chắc chắn là trống)
  const fetchAvailableRooms = async (startTime, endTime, currentRoomId) => {
    setLoadingAvailableRooms(true);
    try {
      // Convert startTime/endTime sang date
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const date = toDateISO_Local(startDate); // YYYY-MM-DD
      
      // Tính TẤT CẢ các slot mà booking trải qua
      const slots = getSlotsFromTimeRange(startTime, endTime);
      const hours = startDate.getHours();
      const minutes = startDate.getMinutes();
      
      console.log("[fetchAvailableRooms] ========== BẮT ĐẦU TÌM PHÒNG TRỐNG ==========");
      console.log("[fetchAvailableRooms] Input:", {
        startTime,
        endTime,
        currentRoomId,
        date,
        time: `${hours}:${minutes.toString().padStart(2, '0')}`,
        slots: slots,
        slotRanges: slots.map(s => `Slot ${s}: ${SLOT_MAPPING[s]?.start || 0}:00 - ${SLOT_MAPPING[s]?.end || 0}:00`)
      });
      
      // Gọi API search available rooms cho TẤT CẢ các slot
      let allAvailableRooms = [];
      try {
        // Gọi API cho từng slot và lấy intersection
        const roomSetsBySlot = [];
        
        for (const slot of slots) {
          try {
            console.log("[fetchAvailableRooms] Gọi API searchAvailableRooms với:", { date, slot });
            const roomsForSlot = await api.searchAvailableRooms({
              date: date,
              slot: slot,
            });
            const roomsArray = Array.isArray(roomsForSlot) ? roomsForSlot : [];
            console.log("[fetchAvailableRooms] Slot", slot, "có", roomsArray.length, "phòng trống");
            roomSetsBySlot.push(roomsArray);
          } catch (slotError) {
            console.error("[fetchAvailableRooms] Lỗi khi gọi API cho slot", slot, ":", slotError);
            // Nếu một slot lỗi, bỏ qua slot đó
            roomSetsBySlot.push([]);
          }
        }
        
        // Lấy intersection: phòng phải trống trong TẤT CẢ các slot
        if (roomSetsBySlot.length > 0) {
          // Bắt đầu với slot đầu tiên
          allAvailableRooms = roomSetsBySlot[0] || [];
          
          // Intersect với các slot còn lại
          for (let i = 1; i < roomSetsBySlot.length; i++) {
            const currentSlotRooms = roomSetsBySlot[i] || [];
            const currentRoomIds = new Set(currentSlotRooms.map(r => r.id));
            allAvailableRooms = allAvailableRooms.filter(room => currentRoomIds.has(room.id));
          }
          
          console.log("[fetchAvailableRooms] ✅ Intersection của", slots.length, "slot:", allAvailableRooms.length, "phòng trống trong TẤT CẢ các slot");
        }
        
        // Nếu không có phòng trống trong tất cả các slot
        if (!allAvailableRooms || allAvailableRooms.length === 0) {
          console.warn("[fetchAvailableRooms] ⚠️ Không có phòng trống trong TẤT CẢ các slot", slots);
          console.warn("[fetchAvailableRooms] Thử fallback: Lấy tất cả phòng ACTIVE (không chắc chắn là trống)");
          throw new Error("No available rooms in all slots");
        }
        
        // Nếu API thành công, không dùng fallback
        setIsUsingFallback(false);
      } catch (searchError) {
        console.error("[fetchAvailableRooms] ❌ API searchAvailableRooms failed:", searchError);
        console.error("[fetchAvailableRooms] Error message:", searchError.message);
        
        // Nếu là 403 Forbidden, log thông báo rõ ràng
        if (searchError.message?.includes('403') || searchError.message?.includes('Forbidden') || searchError.message?.includes('permission')) {
          console.warn("[fetchAvailableRooms] ⚠️ API bị chặn quyền (403). Sử dụng fallback.");
        }
        
        console.log("[fetchAvailableRooms] 🔄 Fallback: Lấy tất cả phòng ACTIVE của campus");
        
        // FALLBACK: Lấy tất cả phòng ACTIVE của campus
        // LƯU Ý: Fallback này chỉ lấy phòng ACTIVE, KHÔNG kiểm tra xem phòng có trống trong slot đó không
        // Vì không có API để check availability của từng phòng
        setIsUsingFallback(true); // Đánh dấu đang dùng fallback
        const campusId = user?.campusId || (user?.campus === 'hcm' ? 2 : user?.campus === 'hn' ? 1 : 2);
        console.log("[fetchAvailableRooms] Fallback - campusId:", campusId);
        
        const allRooms = await api.getRooms({ 
          campusId, 
          includeInactive: false,
          allStatuses: false // Chỉ lấy phòng ACTIVE (không lấy maintenance/inactive)
        });
        console.log("[fetchAvailableRooms] Fallback - getRooms returned", allRooms?.length || 0, "rooms");
        
        // Filter phòng ACTIVE và không phải phòng hiện tại
        allAvailableRooms = (allRooms || []).filter(room => {
          const roomId = room.id?.toString();
          const currentId = currentRoomId?.toString();
          const isNotCurrentRoom = roomId !== currentId;
          const isActive = room.status === 'active' || room.status === 'ACTIVE';
          const isNotMaintenance = room.facilityStatus !== 'maintenance';
          
          return isNotCurrentRoom && isActive && isNotMaintenance;
        });
        console.log("[fetchAvailableRooms] ⚠️ Fallback filtered to", allAvailableRooms.length, "rooms (KHÔNG CHẮC CHẮN là trống)");
      }
      
      // Filter cuối cùng: Đảm bảo loại bỏ phòng hiện tại và chỉ lấy phòng ACTIVE
      const filteredRooms = (allAvailableRooms || []).filter(room => {
        const roomId = room.id?.toString();
        const currentId = currentRoomId?.toString();
        const status = (room.status || room.facilityStatus || '').toString().toUpperCase();
        const facilityStatus = (room.facilityStatus || '').toString().toLowerCase();
        const originalStatus = room.status || room.facilityStatus || '';
        
        // Bỏ phòng hiện tại
        if (roomId === currentId) {
          return false;
        }
        
        // Chỉ lấy phòng ACTIVE (không phải maintenance hoặc inactive)
        const isActive = status === 'ACTIVE' || originalStatus === 'active' || originalStatus === 'ACTIVE';
        const isNotMaintenance = facilityStatus !== 'maintenance' && 
                                 originalStatus !== 'MAINTENANCE' && 
                                 originalStatus !== 'maintenance';
        
        return isActive && isNotMaintenance;
      });
      
      console.log("[fetchAvailableRooms] ✅ Kết quả cuối cùng:", filteredRooms.length, "phòng trống");
      console.log("[fetchAvailableRooms] Danh sách phòng:", filteredRooms.map(r => ({ id: r.id, name: r.name })));
      console.log("[fetchAvailableRooms] isUsingFallback:", isUsingFallback);
      console.log("[fetchAvailableRooms] ========== KẾT THÚC ==========");
      
      setAvailableRooms(filteredRooms);
    } catch (error) {
      console.error("[fetchAvailableRooms] ❌ Lỗi nghiêm trọng:", error);
      console.error("[fetchAvailableRooms] Error details:", {
        message: error.message,
        stack: error.stack
      });
      setAvailableRooms([]);
    } finally {
      setLoadingAvailableRooms(false);
    }
  };

  const handleApprove = async (request) => {
    setSelectedRequest(request);
    setSelectedNewRoom(null);
    setAvailableRooms([]);
    setIsRoomMaintenance(false);
    setIsUsingFallback(false); // Reset fallback flag
    
    // Lấy roomId và kiểm tra trạng thái phòng
    const currentRoomId = request.facilityId || request.roomId || request.facility?.id;
    let roomMaintenance = false;
    let roomInactive = false;
    
    // Kiểm tra trạng thái phòng từ request data trước (nếu có)
    const requestRoomStatus = request.facility?.status || request.room?.status || request.status;
    const statusUpper = String(requestRoomStatus || '').toUpperCase();
    
    if (statusUpper === 'MAINTENANCE') {
      roomMaintenance = true;
      setIsRoomMaintenance(true);
      setIsRoomInactive(false);
    } else if (statusUpper === 'INACTIVE') {
      roomInactive = true;
      setIsRoomInactive(true);
      setIsRoomMaintenance(false);
    } else {
      setIsRoomMaintenance(false);
      setIsRoomInactive(false);
    }
    
    // Nếu chưa có thông tin từ request, gọi API để kiểm tra (chỉ Facility Admin)
    if (!roomMaintenance && !roomInactive && currentRoomId && isFacilityAdmin) {
      try {
        const roomDetail = await api.getFacilityDetail(currentRoomId);
        const roomStatusValue = String(roomDetail?.status || roomDetail?.facilityStatus || '').toUpperCase();
        
        // Kiểm tra nếu phòng đang bảo trì
        if (roomStatusValue === 'MAINTENANCE') {
          roomMaintenance = true;
          setIsRoomMaintenance(true);
          setIsRoomInactive(false);
        } 
        // Kiểm tra nếu phòng đang ngừng hoạt động
        else if (roomStatusValue === 'INACTIVE') {
          roomInactive = true;
          setIsRoomInactive(true);
          setIsRoomMaintenance(false);
        } else {
          setIsRoomMaintenance(false);
          setIsRoomInactive(false);
        }
      } catch (error) {
        console.error("[handleApprove] Lỗi kiểm tra trạng thái phòng:", error);
      }
    }
    
    // Kiểm tra conflict trước khi approve (không block nếu lỗi)
    let conflicts = [];
    try {
      conflicts = await api.checkBookingConflicts(request.id, user.campus);
      setConflictCount(conflicts.length);
      setConflictList(conflicts);
    } catch (error) {
      console.error("[handleApprove] Lỗi kiểm tra conflict (không block):", error);
      setConflictCount(0);
      setConflictList([]);
      // Vẫn tiếp tục, không return
    }
    
    // Fetch available rooms nếu:
    // 1. Có conflict HOẶC
    // 2. Phòng đang bảo trì HOẶC
    // 3. Phòng đang ngừng hoạt động
    const shouldFetchRooms = (conflicts.length > 0 || roomMaintenance || roomInactive) && 
                              request.startTime && 
                              request.endTime && 
                              isFacilityAdmin;
    
    console.log("[handleApprove] shouldFetchRooms:", shouldFetchRooms, {
      hasConflicts: conflicts.length > 0,
      roomMaintenance,
      roomInactive,
      hasStartTime: !!request.startTime,
      hasEndTime: !!request.endTime,
      isFacilityAdmin
    });
    
    if (shouldFetchRooms) {
      try {
        console.log("[handleApprove] Bắt đầu fetch available rooms...");
        await fetchAvailableRooms(request.startTime, request.endTime, currentRoomId);
        console.log("[handleApprove] ✅ Fetch available rooms hoàn tất");
      } catch (error) {
        console.error("[handleApprove] Lỗi fetch available rooms (không block):", error);
        // Vẫn tiếp tục, không block modal
      }
    } else {
      console.log("[handleApprove] ⚠️ Không fetch available rooms vì điều kiện không thỏa");
    }
    
    setShowApproveModal(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối!");
      return;
    }

    try {
      await api.rejectBooking(selectedRequest.id, rejectReason, user?.name || "Admin");
      await loadRequests();
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason("");
      alert("Đã từ chối đơn thành công!");
    } catch (error) {
      alert("Lỗi khi từ chối đơn!");
    }
  };

  const confirmApprove = async () => {
    try {
      // Chỉ Facility Admin mới có thể chuyển phòng
      const alternativeFacilityId = (isFacilityAdmin && selectedNewRoom?.id) || null;
      
      await api.approveBooking(
        selectedRequest.id, 
        user.campus, 
        user?.name || "Admin",
        alternativeFacilityId
      );
      
      await loadRequests();
      setShowApproveModal(false);
      setSelectedRequest(null);
      setConflictCount(0);
      setConflictList([]);
      setSelectedNewRoom(null);
      setAvailableRooms([]);
      
      const message = alternativeFacilityId 
        ? `Đã duyệt đơn thành công và chuyển sang phòng ${selectedNewRoom.name || selectedNewRoom.facilityName}!${conflictCount > 0 ? ` ${conflictCount} đơn trùng lịch đã bị tự động từ chối.` : ''}`
        : `Đã duyệt đơn thành công!${conflictCount > 0 ? ` ${conflictCount} đơn trùng lịch đã bị tự động từ chối.` : ''}`;
      
      alert(message);
    } catch (error) {
      console.error("[confirmApprove] Error:", error);
      alert("Lỗi khi duyệt đơn!");
    }
  };

  const formatTime = (startTime, endTime) => {
    // Nếu không có startTime hoặc endTime (trường hợp BookingGroup), hiển thị "Theo lịch trình"
    if (!startTime || !endTime) return "Theo lịch trình";
    
    try {
      // Parse ISO string hoặc Date object
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      // Format thành HH:MM
      const startStr = start.toLocaleTimeString("vi-VN", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: false 
      });
      const endStr = end.toLocaleTimeString("vi-VN", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: false 
      });
      
      return `${startStr} - ${endStr}`;
    } catch (error) {
      console.error("[formatTime] Error:", error, { startTime, endTime });
      return "Theo lịch trình";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      
      return date.toLocaleDateString("vi-VN", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
    } catch (error) {
      console.error("[formatDate] Error:", error, { dateString });
      return "N/A";
    }
  };

  const formatCreatedAt = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} ngày trước (${date.toLocaleDateString("vi-VN", { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })})`;
    } else if (diffHours > 0) {
      return `${diffHours} giờ trước`;
    } else {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins > 0 ? `${diffMins} phút trước` : "Vừa xong";
    }
  };

  const getPriorityBadge = (index, createdAt) => {
    // Đơn đầu tiên (index 0) là đơn đặt trước nhất
    if (index === 0) {
      return <Badge type="success" className="text-xs">Đặt trước nhất</Badge>;
    }
    return null;
  };

  // Sử dụng danh sách tất cả loại phòng từ API (không chỉ từ requests)
  const allTypes = useMemo(() => {
    return facilityTypes.map(type => type.name).sort();
  }, [facilityTypes]);

  // Separate requests into 3 categories based on type and status
  const { singlePendingRequests, recurringPendingRequests, recurringActiveRequests } = useMemo(() => {
    const singlePending = [];
    const recurringPending = [];
    const recurringActive = [];
    
    console.log("[ApprovalList] Separating requests. Total:", requests.length);
    
    // Count items with isGroup
    const itemsWithIsGroup = requests.filter(r => r.isGroup === true);
    console.log("[ApprovalList] Items with isGroup=true:", itemsWithIsGroup.length);
    if (itemsWithIsGroup.length > 0) {
      console.log("[ApprovalList] First isGroup item:", itemsWithIsGroup[0]);
    }
    
    requests.forEach((req, index) => {
      const status = String(req.status || "").toUpperCase();
      const isRecurring = isRecurringBooking(req);
      
      // Debug logging for items with isGroup or first few items
      if (req.isGroup === true || index < 3) {
        console.log(`[ApprovalList] Request ${index}:`, {
          id: req.id,
          status,
          isRecurring,
          bookingType: req.bookingType,
          bookingTypeName: req.bookingType?.name,
          isGroup: req.isGroup,
          isRecurringFlag: req.isRecurring,
          hasBookingsArray: Array.isArray(req.bookings) && req.bookings.length > 0,
          bookingsLength: req.bookings?.length || 0
        });
      }
      
      if (isRecurring) {
        // Check for PENDING or PENDING_GROUP status
        if (status === "PENDING" || status === "PENDING_GROUP") {
          recurringPending.push(req);
        } else if (status === "APPROVED") {
          // For RECURRING_ACTIVE tab: only APPROVED (not APPROVED_GROUP)
          recurringActive.push(req);
        }
      } else {
        // Single bookings with PENDING status (not PENDING_GROUP)
        if (status === "PENDING") {
          singlePending.push(req);
        }
      }
    });
    
    console.log("[ApprovalList] Separated counts:", {
      singlePending: singlePending.length,
      recurringPending: recurringPending.length,
      recurringActive: recurringActive.length
    });
    
    return { 
      singlePendingRequests: singlePending, 
      recurringPendingRequests: recurringPending,
      recurringActiveRequests: recurringActive
    };
  }, [requests]);

  // Filter requests theo activeTab, search term và type filter
  const filteredRequests = useMemo(() => {
    let baseRequests = [];
    
    if (activeTab === 'SINGLE_PENDING') {
      baseRequests = singlePendingRequests;
    } else if (activeTab === 'RECURRING_PENDING') {
      baseRequests = recurringPendingRequests;
    } else if (activeTab === 'RECURRING_ACTIVE') {
      baseRequests = recurringActiveRequests;
    }
    
    return baseRequests.filter((req) => {
      // Filter theo search term (tìm trong tên phòng, tên người đặt, email)
      const matchesSearch = !searchTerm || 
        req.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter theo loại phòng
      const matchesType = typeFilter === "all" || req.roomType === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [activeTab, singlePendingRequests, recurringPendingRequests, recurringActiveRequests, searchTerm, typeFilter]);

  // Count for each tab
  const singlePendingCount = singlePendingRequests.length;
  const recurringPendingCount = recurringPendingRequests.length;
  const recurringActiveCount = recurringActiveRequests.length;

  return (
    <AdminLayout>
      {/* Header - Fixed */}
      <AdminHeader>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Duyệt yêu cầu đặt phòng</h1>
            <p className="text-gray-500">Xem và xử lý các yêu cầu đặt phòng đang chờ duyệt tại {user?.campusName}.</p>
          </div>
          <Badge type="warning" className="text-base px-4 py-2">
            {loading ? 0 : (() => {
              if (searchTerm || typeFilter !== "all") {
                return filteredRequests.length;
              }
              if (activeTab === 'SINGLE_PENDING') return singlePendingCount;
              if (activeTab === 'RECURRING_PENDING') return recurringPendingCount;
              if (activeTab === 'RECURRING_ACTIVE') return recurringActiveCount;
              return 0;
            })()} {activeTab === 'RECURRING_ACTIVE' ? 'lịch đang chạy' : 'đơn chờ duyệt'}
          </Badge>
        </div>
      </AdminHeader>

      {/* Content - Scrollable */}
      <AdminContent>
        {/* Tab Navigation */}
        {!loading && (
          <Card className="mb-4">
            <div className="border-b border-gray-200">
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setActiveTab('SINGLE_PENDING');
                    setSearchTerm(""); // Clear search when switching tabs
                  }}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors relative ${
                    activeTab === 'SINGLE_PENDING'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Booking Lẻ
                  {singlePendingCount > 0 && (
                    <Badge 
                      type={activeTab === 'SINGLE_PENDING' ? "warning" : "secondary"} 
                      className="ml-2 text-xs"
                    >
                      {singlePendingCount}
                    </Badge>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('RECURRING_PENDING');
                    setSearchTerm(""); // Clear search when switching tabs
                  }}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors relative ${
                    activeTab === 'RECURRING_PENDING'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Định kỳ - Chờ duyệt
                  {recurringPendingCount > 0 && (
                    <Badge 
                      type={activeTab === 'RECURRING_PENDING' ? "warning" : "secondary"} 
                      className="ml-2 text-xs"
                    >
                      {recurringPendingCount}
                    </Badge>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('RECURRING_ACTIVE');
                    setSearchTerm(""); // Clear search when switching tabs
                  }}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors relative ${
                    activeTab === 'RECURRING_ACTIVE'
                      ? 'border-orange-500 text-orange-600 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Check lịch định kỳ
                  {recurringActiveCount > 0 && (
                    <Badge 
                      type={activeTab === 'RECURRING_ACTIVE' ? "success" : "secondary"} 
                      className="ml-2 text-xs"
                    >
                      {recurringActiveCount}
                    </Badge>
                  )}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Toolbar với Search và Filter */}
        {!loading && requests.length > 0 && (
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Ô Tìm kiếm */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên phòng, người đặt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Lọc Loại phòng */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium cursor-pointer min-w-[160px]"
              >
                <option value="all">Tất cả loại</option>
                {allTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {/* Nút Tạo lịch mới */}
              <Button
                onClick={() => setShowBookingModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Tạo lịch mới
              </Button>
            </div>
          </Card>
        )}

        {/* Danh sách yêu cầu */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">
              {activeTab === 'SINGLE_PENDING'
                ? (singlePendingCount === 0 
                    ? "Hiện không có đơn lẻ nào đang chờ duyệt."
                    : "Không tìm thấy đơn lẻ nào phù hợp với bộ lọc.")
                : activeTab === 'RECURRING_PENDING'
                ? (recurringPendingCount === 0
                    ? "Hiện không có đơn định kỳ nào đang chờ duyệt."
                    : "Không tìm thấy đơn định kỳ nào phù hợp với bộ lọc.")
                : (recurringActiveCount === 0
                    ? "Không có lịch định kỳ nào đang chạy."
                    : "Không tìm thấy lịch định kỳ nào phù hợp với bộ lọc.")}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req, index) => (
              <Card 
                key={req.id} 
                className={`p-6 hover:shadow-md transition-shadow cursor-pointer ${index === 0 ? 'border-2 border-green-200 bg-green-50/30' : ''}`}
                onClick={() => {
                  // For RECURRING_ACTIVE tab: resolve parent ID
                  const parentId = activeTab === 'RECURRING_ACTIVE' ? resolveParentId(req) : req.id;
                  setSelectedBookingId(parentId);
                  setSelectedBookingData(req); // Pass full booking data
                  setShowDetailModal(true);
                }}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Thông tin chính */}
                  <div className="flex-1 space-y-4">
                    {/* Header với Room và Date */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Building2 className="w-5 h-5 text-orange-600" />
                          <h3 className="text-xl font-bold text-gray-900">{req.roomName || "N/A"}</h3>
                          {getPriorityBadge(index, req.createdAt)}
                          {req.isEvent && (
                            <Badge type="info" className="text-xs">Sự kiện CLB</Badge>
                          )}
                          {req.isRecurring && (
                            <Badge type="info" className="text-xs">Định kỳ</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(req.date || req.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(req.startTime, req.endTime)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>Đặt: {formatCreatedAt(req.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Thông tin người đặt */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                          <User className="w-4 h-4" />
                          <span>Người đặt</span>
                        </div>
                        <p className="font-medium text-gray-900">{req.userName || "N/A"}</p>
                        {req.userEmail && (
                          <p className="text-xs text-gray-500">{req.userEmail}</p>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                          <Users className="w-4 h-4" />
                          <span>Số người tham gia</span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {req.participantCount !== null && req.participantCount !== undefined && req.participantCount !== ""
                            ? `${req.participantCount} người` 
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Progress display for RECURRING_ACTIVE tab (aggregated parent groups) */}
                    {activeTab === 'RECURRING_ACTIVE' && req._aggregated && (
                      <div className="pt-4 border-t border-gray-100">
                        <div className="space-y-2">
                          {/* Date Range */}
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Thời gian</div>
                            {req._aggregated.minStartTime && req._aggregated.maxEndTime ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {new Date(req._aggregated.minStartTime).toLocaleDateString("vi-VN", { 
                                    day: "2-digit", 
                                    month: "2-digit", 
                                    year: "numeric" 
                                  })} → {new Date(req._aggregated.maxEndTime).toLocaleDateString("vi-VN", { 
                                    day: "2-digit", 
                                    month: "2-digit", 
                                    year: "numeric" 
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </div>
                          {/* Progress */}
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Tiến độ</div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {req._aggregated.usedSlots}/{req._aggregated.totalSlots} buổi
                              </span>
                              <Badge type="success" className="text-xs">Đang hoạt động</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lý do đặt phòng */}
                    {req.reason && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-1">
                          <Info className="w-4 h-4" />
                          <span>Lý do đặt phòng</span>
                        </div>
                        <p className="text-sm text-blue-800">{req.reason}</p>
                      </div>
                    )}

                    {/* Lý do Priority (nếu có) */}
                    {req.priorityReason && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-orange-900 mb-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>Lý do ưu tiên</span>
                        </div>
                        <p className="text-sm text-orange-800">{req.priorityReason}</p>
                      </div>
                    )}

                    {/* Thông tin bổ sung */}
                    {req.supportRequest && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Yêu cầu hỗ trợ:</span> {req.supportRequest}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div 
                    className="flex flex-col gap-3 lg:w-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {activeTab === 'RECURRING_ACTIVE' ? (
                      // Tab 3: Only show "Xem lộ trình" button
                      <>
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            // For aggregated parent groups, use bookingGroupId (which is the parent ID)
                            const parentId = req.bookingGroupId || req.id;
                            console.log("[ApprovalList] Opening detail modal for RECURRING_ACTIVE:", {
                              itemId: req.id,
                              bookingGroupId: req.bookingGroupId,
                              resolvedParentId: parentId,
                              aggregated: !!req._aggregated
                            });
                            setSelectedBookingId(parentId);
                            setSelectedBookingData(req);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Xem chi tiết
                        </Button>
                        <div className="text-xs text-gray-500 text-center pt-2">
                          Đơn #{req.bookingCode || req.id}
                        </div>
                      </>
                    ) : (
                      // Tab 1 & 2: Show all actions
                      <>
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBookingId(req.id);
                            setSelectedBookingData(req); // Pass full booking data
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Xem chi tiết
                        </Button>
                        <Button
                          variant="primary"
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Tab SINGLE_PENDING: Always approve directly
                            // Tab RECURRING_PENDING: Open modal to approve child slots
                            if (activeTab === 'RECURRING_PENDING') {
                              setSelectedBookingId(req.id);
                              setSelectedBookingData(req); // Pass full booking data
                              setShowDetailModal(true);
                            } else {
                              handleApprove(req);
                            }
                          }}
                        >
                          <Check className="w-4 h-4" />
                          Duyệt đơn
                        </Button>
                        <Button
                          variant="danger"
                          className="w-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(req);
                          }}
                        >
                          <X className="w-4 h-4" />
                          Từ chối
                        </Button>
                        <div className="text-xs text-gray-500 text-center pt-2">
                          Đơn #{req.bookingCode || req.id}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AdminContent>

      {/* Modals - Scrollable Overlay */}
      {/* Modal Từ chối */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4 px-6 pt-6">
                <h2 className="text-xl font-bold text-gray-900">Từ chối yêu cầu</h2>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectReason("");
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 px-6 overflow-y-auto flex-1">
                <p className="text-sm text-gray-600 mb-2">
                  Bạn đang từ chối yêu cầu đặt phòng <strong>{selectedRequest.roomName}</strong> của <strong>{selectedRequest.userName}</strong>.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do từ chối *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Nhập lý do từ chối yêu cầu này..."
                  required
                />
              </div>

              <div className="sticky bottom-0 bg-white border-t pt-4 px-6 pb-6 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectReason("");
                  }}
                >
                  Hủy
                </Button>
                <Button variant="danger" onClick={confirmReject}>
                  Xác nhận từ chối
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Duyệt */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4 px-6 pt-6">
                <h2 className="text-xl font-bold text-gray-900">Duyệt yêu cầu</h2>
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedRequest(null);
                    setConflictCount(0);
                    setConflictList([]);
                    setSelectedNewRoom(null);
                    setAvailableRooms([]);
                    setIsRoomMaintenance(false);
                    setIsRoomInactive(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 px-6 overflow-y-auto flex-1">
                <p className="text-sm text-gray-600 mb-4">
                  Bạn đang duyệt yêu cầu đặt phòng <strong>{selectedRequest.roomName}</strong> của <strong>{selectedRequest.userName}</strong>.
                </p>

                {(conflictCount > 0 || isRoomMaintenance || isRoomInactive) ? (
                  <div className="space-y-4">
                    {/* Alert phòng bảo trì */}
                    {isRoomMaintenance && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-yellow-900 mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>⚠️ Phòng đang bảo trì</span>
                        </div>
                        <p className="text-sm text-yellow-800">
                          Phòng <strong>{selectedRequest.roomName}</strong> đang trong trạng thái <strong>Bảo trì</strong>. 
                          Bạn nên chuyển đơn sang phòng khác.
                        </p>
                      </div>
                    )}

                    {/* Alert phòng ngừng hoạt động */}
                    {isRoomInactive && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-900 mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>⚠️ Phòng đang ngừng hoạt động</span>
                        </div>
                        <p className="text-sm text-red-800">
                          Phòng <strong>{selectedRequest.roomName}</strong> đang trong trạng thái <strong>Ngừng hoạt động</strong>. 
                          Bạn nên chuyển đơn sang phòng khác.
                        </p>
                      </div>
                    )}

                    {/* Alert xung đột lịch */}
                    {conflictCount > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-900 mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>⚠️ Xung đột lịch</span>
                        </div>
                        <p className="text-sm text-red-800 mb-3">
                          Phòng <strong>{selectedRequest.roomName}</strong> đã bị đặt trùng lịch với <strong>{conflictCount}</strong> yêu cầu khác.
                        </p>
                      
                      {/* Danh sách các booking bị conflict */}
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {conflictList.map((conflict, idx) => {
                          const isOlder = conflict.createdAt && selectedRequest.createdAt 
                            ? new Date(conflict.createdAt).getTime() < new Date(selectedRequest.createdAt).getTime()
                            : false;
                          
                          return (
                            <div 
                              key={conflict.id} 
                              className={`bg-white border rounded p-2 text-xs ${
                                isOlder 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-yellow-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">#{conflict.bookingCode || conflict.id}</span>
                                  <span className="text-gray-600">- {conflict.userName || "N/A"}</span>
                                  {isOlder && (
                                    <Badge type="danger" className="text-xs">Đặt trước</Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-gray-600 text-xs">
                                    {formatTime(conflict.startTime, conflict.endTime)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      </div>
                    )}

                    {/* Dropdown chọn phòng trống - CHỈ HIỂN THỊ CHO FACILITY ADMIN */}
                    {isFacilityAdmin && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Chuyển sang phòng trống khác:
                        </label>
                        {isUsingFallback && (
                          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-800">
                              ⚠️ <strong>Lưu ý:</strong> Đang hiển thị tất cả phòng ACTIVE (không chắc chắn là trống trong khung giờ này) vì không thể kiểm tra availability. Vui lòng kiểm tra thủ công trước khi chuyển phòng.
                            </p>
                          </div>
                        )}
                        {loadingAvailableRooms ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                            <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                            <span>Đang tìm phòng trống...</span>
                          </div>
                        ) : availableRooms.length > 0 ? (
                          <select
                            value={selectedNewRoom?.id || ""}
                            onChange={(e) => {
                              const roomId = e.target.value;
                              const room = availableRooms.find(r => r.id.toString() === roomId);
                              setSelectedNewRoom(room || null);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          >
                            <option value="">-- Chọn phòng trống --</option>
                            {availableRooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.name || room.facilityName} - Sức chứa: {room.capacity || "N/A"} người
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-sm text-gray-500 py-2">
                            Không tìm thấy phòng trống trong khung giờ này.
                          </div>
                        )}
                        
                        {selectedNewRoom && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800">
                              ✅ Đã chọn: <strong>{selectedNewRoom.name || selectedNewRoom.facilityName}</strong>
                              {selectedNewRoom.capacity && ` (${selectedNewRoom.capacity} người)`}
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Đơn sẽ được chuyển sang phòng này khi duyệt.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Lưu ý:</strong>
                        {conflictCount > 0 && ` Nếu bạn duyệt đơn này, ${conflictCount} yêu cầu trùng lịch sẽ tự động bị từ chối.`}
                        {isRoomMaintenance && " Phòng đang bảo trì, không thể sử dụng."}
                        {isRoomInactive && " Phòng đang ngừng hoạt động, không thể sử dụng."}
                        {isFacilityAdmin && selectedNewRoom && " Đơn này sẽ được chuyển sang phòng mới."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-900">
                      <Check className="w-4 h-4" />
                      <span>✅ Thời gian hợp lệ</span>
                    </div>
                    <p className="text-sm text-green-800 mt-2">
                      Phòng <strong>{selectedRequest.roomName}</strong> còn trống trong khung giờ này.
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-4">
                  Bạn có chắc chắn muốn duyệt yêu cầu này không?
                </p>
              </div>

              <div className="sticky bottom-0 bg-white border-t pt-4 px-6 pb-6 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedRequest(null);
                    setConflictCount(0);
                    setConflictList([]);
                    setSelectedNewRoom(null);
                    setAvailableRooms([]);
                    setIsRoomMaintenance(false);
                    setIsRoomInactive(false);
                  }}
                >
                  Hủy
                </Button>
                <Button 
                  variant="primary" 
                  onClick={confirmApprove}
                >
                  {isFacilityAdmin && selectedNewRoom ? "Duyệt và chuyển phòng" : "Xác nhận duyệt"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Booking Action Modal */}
      <BookingActionModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setBookingFormData(null);
        }}
        onSuccess={async (result) => {
          console.log("[ApprovalList] Booking created successfully:", result);
          try {
            // Reload danh sách yêu cầu
            await loadRequests();
          } catch (error) {
            console.error("[ApprovalList] Error reloading requests after booking creation:", error);
            // Không throw để không ảnh hưởng đến UI
            // User có thể tự reload trang nếu cần
          }
          setShowBookingModal(false);
          setBookingFormData(null);
        }}
        bookingData={bookingFormData}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedBookingId(null);
          setSelectedBookingData(null);
        }}
        bookingId={selectedBookingId}
        initialBookingData={selectedBookingData}
        defaultTab={activeTab === 'RECURRING_ACTIVE' ? 'tracking' : (activeTab === 'RECURRING_PENDING' ? 'approval' : null)}
        onSuccess={async () => {
          // Reload danh sách yêu cầu sau khi có action
          try {
            await loadRequests();
          } catch (error) {
            console.error("[ApprovalList] Error reloading requests after detail action:", error);
          }
        }}
      />
    </AdminLayout>
  );
}


