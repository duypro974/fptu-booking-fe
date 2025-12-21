import { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  Users,
  FileText,
  Building2,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { checkConflicts } from "../../services/adminService";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { toDateISO_Local, buildDateTimeVN } from "../../lib/utils";

export default function BookingActionModal({
  isOpen,
  onClose,
  onSuccess,
  bookingData, // { facilityId, date, slotIds, purpose, participants, startTime, endTime }
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  // ⭐ NEW: modal xác nhận trước khi ghi đè
const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false);
// ⭐ NEW: danh sách conflict chờ xác nhận
const [pendingConflicts, setPendingConflicts] = useState([]);

  const [conflictData, setConflictData] = useState(null); // list conflicts to show in overlay
  const [overrideReason, setOverrideReason] = useState("");
  const [showConfirmOverride, setShowConfirmOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [preparedBookingData, setPreparedBookingData] = useState(null);
  const [previewConflicts, setPreviewConflicts] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // ✅ only use this to block double-click (single source of truth)
  const inFlightRef = useRef(false);

  // Form state (khi chưa có bookingData)
  const [formData, setFormData] = useState({
    facilityId: "",
    date: "",
    selectedSlots: [],
    purpose: "",
    participants: "",
    rejectReason: "", // bạn dùng để auto-fill overrideReason (FE only)
  });

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Slot mapping: mỗi slot = 2 tiếng
  const SLOT_MAPPING = useMemo(
    () => ({
      1: { start: 7, end: 9, label: "Slot 1 (07:00 - 09:00)" },
      2: { start: 9, end: 11, label: "Slot 2 (09:00 - 11:00)" },
      3: { start: 11, end: 13, label: "Slot 3 (11:00 - 13:00)" },
      4: { start: 13, end: 15, label: "Slot 4 (13:00 - 15:00)" },
      5: { start: 15, end: 17, label: "Slot 5 (15:00 - 17:00)" },
    }),
    []
  );

  // ---------------- helpers: normalize conflict/booking ----------------
  const pickBookingFromConflict = (conflict) => {
    // conflict structure from BE can be:
    // - { booking1, booking2, facility, conflictType }
    // - or already a booking-like object
    return conflict?.booking1 || conflict?.booking2 || conflict;
  };

  const getStatusUpper = (conflict) => {
    const booking = pickBookingFromConflict(conflict);
    return String(booking?.status || conflict?.status || "").toUpperCase();
  };

  const getFacilityIdFromConflict = (conflict) => {
    const booking = pickBookingFromConflict(conflict);
    return (
      booking?.facilityId ||
      conflict?.facilityId ||
      conflict?.facility?.id ||
      booking?.facility?.id ||
      null
    );
  };

  const isBlockingStatus = (statusUpper) => {
    // ✅ rule: conflicts relevant for holding schedule
    return statusUpper === "APPROVED" || statusUpper === "PENDING";
  };

  const getUserNameFromConflict = (conflict) => {
    const booking = pickBookingFromConflict(conflict);
    return (
      booking?.userName ||
      booking?.user?.fullName ||
      booking?.user?.name ||
      conflict?.userName ||
      conflict?.user?.fullName ||
      conflict?.user?.name ||
      booking?.createdBy?.fullName ||
      booking?.createdBy?.name ||
      "N/A"
    );
  };

  const getBadgeMeta = (statusUpper) => {
    // adjust types to match your Badge component
    if (statusUpper === "APPROVED") return { type: "success", label: "Đã duyệt" };
    if (statusUpper === "PENDING") return { type: "warning", label: "Chờ duyệt" };
    if (statusUpper === "CANCELLED") return { type: "secondary", label: "Đã hủy" };
    if (statusUpper === "REJECTED") return { type: "danger", label: "Từ chối" };
    return { type: "secondary", label: statusUpper || "N/A" };
  };

  // Format time
  const formatTime = (conflict) => {
    const booking = pickBookingFromConflict(conflict);

    let startTime =
      booking?.startTime ||
      conflict?.startTime ||
      conflict?.start ||
      conflict?.timeStart ||
      conflict?.bookingStartTime;

    let endTime =
      booking?.endTime ||
      conflict?.endTime ||
      conflict?.end ||
      conflict?.timeEnd ||
      conflict?.bookingEndTime;

    if (!startTime && (booking?.date || conflict?.date) && booking?.slot) {
      const date = booking?.date || conflict?.date;
      const slotNum = Number(booking?.slot);
      const slotInfo = SLOT_MAPPING[slotNum];
      if (slotInfo) {
        startTime = `${date}T${String(slotInfo.start).padStart(2, "0")}:00:00`;
        endTime = `${date}T${String(slotInfo.end).padStart(2, "0")}:00:00`;
      }
    }

    if (!startTime || !endTime) return "N/A";

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return "N/A";

      const startStr = start.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const endStr = end.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `${startStr} - ${endStr}`;
    } catch {
      return "N/A";
    }
  };

  // ---------------- lifecycle ----------------
  useEffect(() => {
    if (isOpen && !bookingData) loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingData]);

  // Debounced preview conflicts
  useEffect(() => {
    if (!isOpen || bookingData) {
      setPreviewConflicts([]);
      return;
    }

    const hasRequiredInfo =
      formData.facilityId && formData.date && formData.selectedSlots.length > 0;
    if (!hasRequiredInfo) {
      setPreviewConflicts([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkPreviewConflicts();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.facilityId, formData.date, formData.selectedSlots, isOpen, bookingData]);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const data = await api.getRooms({ allStatuses: true });
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[BookingActionModal] Error loading rooms:", e);
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleClose = () => {
    setConflictData(null);
    setOverrideReason("");
    setError("");
    setLoading(false);
    setPreparedBookingData(null);
    inFlightRef.current = false;

    setFormData({
      facilityId: "",
      date: "",
      selectedSlots: [],
      purpose: "",
      participants: "",
      rejectReason: "",
    });

    onClose?.();
  };

  const prepareBookingData = () => {
    if (bookingData) return bookingData;

    if (!formData.facilityId || !formData.date || formData.selectedSlots.length === 0) {
      setError("Vui lòng điền đầy đủ: Phòng, Ngày, và chọn ít nhất 1 slot");
      return null;
    }

    const sortedSlotIds = [...formData.selectedSlots].sort((a, b) => a - b);
    const firstSlot = SLOT_MAPPING[sortedSlotIds[0]];
    const lastSlot = SLOT_MAPPING[sortedSlotIds[sortedSlotIds.length - 1]];
    if (!firstSlot || !lastSlot) {
      setError("Slot không hợp lệ");
      return null;
    }

    const startDateTime = buildDateTimeVN(formData.date, firstSlot.start);
    const endDateTime = buildDateTimeVN(formData.date, lastSlot.end);

    return {
      facilityId: Number(formData.facilityId),
      date: formData.date,
      slotIds: sortedSlotIds,
      purpose: formData.purpose || "Đặt phòng bởi Admin",
      participants: formData.participants ? Number(formData.participants) : 1,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      isEvent: false,
    };
  };

  // ✅ Preview: warn both APPROVED + PENDING
  const checkPreviewConflicts = async () => {
    if (!formData.facilityId || !formData.date || formData.selectedSlots.length === 0) {
      setPreviewConflicts([]);
      return;
    }

    setCheckingConflicts(true);
    try {
      const sortedSlotIds = [...formData.selectedSlots].sort((a, b) => a - b);
      const firstSlot = SLOT_MAPPING[sortedSlotIds[0]];
      const lastSlot = SLOT_MAPPING[sortedSlotIds[sortedSlotIds.length - 1]];

      const start = buildDateTimeVN(formData.date, firstSlot.start);
      const end = buildDateTimeVN(formData.date, lastSlot.end);

      const conflicts = await checkConflicts(
        Number(formData.facilityId),
        start.toISOString(),
        end.toISOString()
      );

      const facilityIdNum = Number(formData.facilityId);

      const blocking = (Array.isArray(conflicts) ? conflicts : []).filter((c) => {
        const fId = Number(getFacilityIdFromConflict(c));
        const status = getStatusUpper(c);
        return fId === facilityIdNum && isBlockingStatus(status);
      });

      setPreviewConflicts(blocking);
    } catch (e) {
      console.error("[BookingActionModal] Error checking preview conflicts:", e);
      setPreviewConflicts([]);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const toggleSlot = (slotId) => {
    setFormData((prev) => {
      const newSlots = prev.selectedSlots.includes(slotId)
        ? prev.selectedSlots.filter((id) => id !== slotId)
        : [...prev.selectedSlots, slotId].sort((a, b) => a - b);
      return { ...prev, selectedSlots: newSlots };
    });
  };

  // ✅ Create: if there are blocking conflicts => show overlay, else create directly
 const handleCreate = async () => {
  if (loading || inFlightRef.current) return;

  const data = prepareBookingData();
  if (!data) return;

  inFlightRef.current = true;
  setLoading(true);
  setError("");

  try {
    console.log("[BookingActionModal] handleCreate - Checking conflicts with:", {
      facilityId: data.facilityId,
      startTime: data.startTime,
      endTime: data.endTime
    });
    
    const conflicts = await checkConflicts(
      data.facilityId,
      data.startTime,
      data.endTime
    );

    console.log("[BookingActionModal] handleCreate - Raw conflicts from API:", conflicts);
    console.log("[BookingActionModal] handleCreate - Conflicts type:", Array.isArray(conflicts) ? 'array' : typeof conflicts);
    console.log("[BookingActionModal] handleCreate - Conflicts length:", Array.isArray(conflicts) ? conflicts.length : 'N/A');

    const facilityIdNum = Number(data.facilityId);
    console.log("[BookingActionModal] handleCreate - Facility ID number:", facilityIdNum);

    const blocking = (Array.isArray(conflicts) ? conflicts : []).filter((c) => {
      // Với conflict structure {booking1, booking2, facility, conflictType}
      // Cần kiểm tra cả booking1 và booking2 có conflict với facilityId đang đặt không
      const booking1 = c?.booking1;
      const booking2 = c?.booking2;
      const conflictFacilityId = c?.facility?.id || c?.facilityId;
      
      // Lấy facilityId từ booking1 và booking2
      const booking1FacilityId = booking1?.facilityId || booking1?.facility?.id;
      const booking2FacilityId = booking2?.facilityId || booking2?.facility?.id;
      
      // Kiểm tra xem có booking nào conflict với facility đang đặt không
      const booking1Matches = booking1FacilityId && Number(booking1FacilityId) === facilityIdNum;
      const booking2Matches = booking2FacilityId && Number(booking2FacilityId) === facilityIdNum;
      const facilityMatches = conflictFacilityId && Number(conflictFacilityId) === facilityIdNum;
      
      const hasMatchingFacility = booking1Matches || booking2Matches || facilityMatches;
      
      // Lấy status từ booking1 hoặc booking2 (ưu tiên booking có facilityId match)
      let status = null;
      if (booking1Matches && booking1?.status) {
        status = String(booking1.status).toUpperCase();
      } else if (booking2Matches && booking2?.status) {
        status = String(booking2.status).toUpperCase();
      } else {
        status = booking1?.status ? String(booking1.status).toUpperCase() : 
                booking2?.status ? String(booking2.status).toUpperCase() : 
                getStatusUpper(c);
      }
      
      const statusMatches = status === "APPROVED" || status === "PENDING";
      const matches = hasMatchingFacility && statusMatches;
      
      // Log chi tiết từng conflict để debug
      console.log("[BookingActionModal] handleCreate - Checking conflict:", {
        conflict: c,
        booking1FacilityId,
        booking2FacilityId,
        conflictFacilityId,
        expectedFacilityId: facilityIdNum,
        booking1Status: booking1?.status,
        booking2Status: booking2?.status,
        extractedStatus: status,
        booking1Matches,
        booking2Matches,
        facilityMatches,
        hasMatchingFacility,
        statusMatches,
        matches,
        fullKeys: Object.keys(c || {})
      });
      
      if (!matches) {
        console.log("[BookingActionModal] handleCreate - ⚠️ Conflict filtered out:", {
          reason: !hasMatchingFacility ? `No matching facility ID (trying to book ${facilityIdNum})` : 
                  `Status not APPROVED/PENDING: ${status}`,
          hasMatchingFacility,
          statusMatches,
          status
        });
      }
      
      return matches;
    });

    // Log conflicts để debug
    console.log("[BookingActionModal] handleCreate - Blocking conflicts after filter:", blocking);
    console.log("[BookingActionModal] handleCreate - Blocking conflicts count:", blocking.length);
    
    // ⭐ NEW: nếu có conflict → MỞ MODAL XÁC NHẬN TRƯỚC
    if (blocking.length > 0) {
      console.log("[BookingActionModal] handleCreate - First blocking conflict structure:", blocking[0]);
      console.log("[BookingActionModal] handleCreate - First blocking conflict keys:", Object.keys(blocking[0] || {}));
      
      // Nếu conflict thiếu thông tin, thử fetch booking detail để enrich data
      const enrichedConflicts = await Promise.all(blocking.map(async (conflict) => {
        const bookingId = getBookingIdFromConflict(conflict);
        const hasUserName = getUserNameFromConflict(conflict) && getUserNameFromConflict(conflict) !== "N/A";
        const hasTime = formatTime(conflict) && formatTime(conflict) !== "N/A";
        
        // Nếu thiếu thông tin và có booking ID hợp lệ, fetch thêm
        if (bookingId && bookingId !== "unknown" && bookingId !== null && (!hasUserName || !hasTime)) {
          try {
            const numericId = Number(bookingId);
            if (!isNaN(numericId) && numericId > 0) {
              console.log("[BookingActionModal] Enriching conflict data - Fetching booking detail for ID:", numericId);
              const bookingDetail = await api.getBookingDetail(numericId);
              
              // Merge thông tin từ booking detail
              return {
                ...conflict,
                ...bookingDetail,
                userName: bookingDetail?.user?.fullName || bookingDetail?.user?.name || getUserNameFromConflict(conflict) || "N/A",
                startTime: bookingDetail?.startTime || conflict?.startTime || conflict?.bookingStartTime,
                endTime: bookingDetail?.endTime || conflict?.endTime || conflict?.bookingEndTime,
                facility: bookingDetail?.facility || conflict?.facility,
              };
            }
          } catch (fetchError) {
            console.warn("[BookingActionModal] Failed to fetch booking detail for ID", bookingId, ":", fetchError);
            return conflict;
          }
        }
        return conflict;
      }));
      
      setPendingConflicts(enrichedConflicts);
      setPreparedBookingData(data);
      setConfirmOverrideOpen(true);
      return;
    }

    await createBooking(data);
  } catch (e) {
    console.error(e);
    setError(e.message || "Lỗi khi kiểm tra xung đột");
  } finally {
    setLoading(false);
    inFlightRef.current = false;
  }
};


  // Helper: Lấy booking ID từ conflict - xử lý nhiều trường hợp
  const getBookingIdFromConflict = (conflict, targetFacilityId = null) => {
    if (!conflict) return null;
    
    // Với conflict structure {booking1, booking2, facility, conflictType}
    // Ưu tiên lấy booking ID từ booking có facilityId match với targetFacilityId
    
    if (targetFacilityId) {
      const booking1 = conflict?.booking1;
      const booking2 = conflict?.booking2;
      
      // Kiểm tra booking1 có facilityId match không
      const booking1FacilityId = booking1?.facilityId || booking1?.facility?.id;
      if (booking1FacilityId && Number(booking1FacilityId) === Number(targetFacilityId)) {
        if (booking1?.id && booking1.id !== "unknown") {
          console.log("[getBookingIdFromConflict] Found booking ID from booking1:", booking1.id);
          return booking1.id;
        }
      }
      
      // Kiểm tra booking2 có facilityId match không
      const booking2FacilityId = booking2?.facilityId || booking2?.facility?.id;
      if (booking2FacilityId && Number(booking2FacilityId) === Number(targetFacilityId)) {
        if (booking2?.id && booking2.id !== "unknown") {
          console.log("[getBookingIdFromConflict] Found booking ID from booking2:", booking2.id);
          return booking2.id;
        }
      }
    }
    
    // Fallback: Thử nhiều cách để lấy booking ID
    const booking = pickBookingFromConflict(conflict);
    
    // Ưu tiên: booking.id
    if (booking?.id && booking.id !== "unknown") {
      return booking.id;
    }
    
    // Thử conflict.id (nếu conflict là booking object)
    if (conflict?.id && conflict.id !== "unknown") {
      return conflict.id;
    }
    
    // Thử conflict.bookingId
    if (conflict?.bookingId) {
      return conflict.bookingId;
    }
    
    // Thử từ booking1 hoặc booking2 (lấy cái nào có ID hợp lệ)
    if (conflict?.booking1?.id && conflict.booking1.id !== "unknown") {
      return conflict.booking1.id;
    }
    if (conflict?.booking2?.id && conflict.booking2.id !== "unknown") {
      return conflict.booking2.id;
    }
    
    console.warn("[getBookingIdFromConflict] ⚠️ Cannot extract booking ID from conflict:", conflict);
    return null;
  };

  // ✅ Override: Cancel các booking trùng lịch trước, sau đó tạo booking mới
  const handleOverride = async () => {
    if (loading || inFlightRef.current) return;

    if (!overrideReason.trim()) {
      setError("Vui lòng nhập lý do ghi đè");
      return;
    }

    const data = preparedBookingData || bookingData;
    if (!data) {
      setError("Thiếu thông tin đặt phòng");
      return;
    }

    // Lấy danh sách conflicts (từ conflictData hoặc pendingConflicts)
    const conflictsToCancel = conflictData || pendingConflicts || [];
    if (conflictsToCancel.length === 0) {
      // Nếu không có conflict, tạo booking bình thường
      return createBooking(data, false);
    }

    inFlightRef.current = true;
    setLoading(true);
    setError("");

    try {
      // Bước 1: Cancel tất cả các booking trùng lịch
      console.log("[BookingActionModal] ⚠️ OVERRIDE: Cancelling", conflictsToCancel.length, "conflicting bookings...");
      
      const cancelPromises = conflictsToCancel.map(async (conflict) => {
        // Truyền facilityId đang đặt để lấy đúng booking ID
        const bookingId = getBookingIdFromConflict(conflict, data.facilityId);
        if (!bookingId) {
          console.warn("[BookingActionModal] ⚠️ Cannot get booking ID from conflict:", conflict);
          // Log toàn bộ structure để debug
          console.warn("[BookingActionModal] Conflict keys:", Object.keys(conflict || {}));
          console.warn("[BookingActionModal] Booking1:", conflict?.booking1);
          console.warn("[BookingActionModal] Booking2:", conflict?.booking2);
          console.warn("[BookingActionModal] Facility:", conflict?.facility);
          return null;
        }
        
        // Validate booking ID là số hợp lệ
        const numericId = Number(bookingId);
        if (isNaN(numericId) || numericId <= 0) {
          console.warn("[BookingActionModal] ⚠️ Invalid booking ID:", bookingId);
          return null;
        }
        
        try {
          console.log("[BookingActionModal] Cancelling booking ID:", numericId, "with reason:", overrideReason.trim());
          await api.cancelByAdmin(numericId, overrideReason.trim());
          console.log("[BookingActionModal] ✅ Successfully cancelled booking:", numericId);
          return numericId;
        } catch (cancelError) {
          console.error("[BookingActionModal] ❌ Failed to cancel booking", numericId, ":", cancelError);
          console.error("[BookingActionModal] Cancel error details:", {
            message: cancelError.message,
            response: cancelError.response?.data
          });
          // Tiếp tục với các booking khác nếu một cái fail
          return null;
        }
      });

      const cancelledIds = await Promise.all(cancelPromises);
      const successCount = cancelledIds.filter(id => id !== null).length;
      console.log("[BookingActionModal] ✅ Successfully cancelled", successCount, "/", conflictsToCancel.length, "bookings");

      // Bước 2: Đợi một chút để backend xử lý xong việc cancel
      await new Promise(resolve => setTimeout(resolve, 500));

      // Bước 3: Tạo booking mới (không cần force vì đã cancel hết conflicts rồi)
      console.log("[BookingActionModal] ⚠️ OVERRIDE: Creating new booking...");
      await createBooking(data, false);
    } catch (e) {
      console.error("[BookingActionModal] Error during override:", e);
      const errorMsg = e.message || "Lỗi khi ghi đè lịch đặt phòng";
      setError(errorMsg);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
      setShowConfirmOverride(false);
    }
  };

  const createBooking = async (data = null, isOverride = false) => {
    const bookingInfo = data || bookingData || preparedBookingData;
    if (!bookingInfo) {
      setError("Thiếu thông tin đặt phòng");
      return;
    }

    try {
      // ✅ api.createBooking maps to createBookingWithFormat => expects { facilityId, date, slotIds, purpose, participants, isEvent, force, overrideReason }
      const bookingPayload = {
        facilityId: bookingInfo.facilityId,
        date: bookingInfo.date,
        slotIds: bookingInfo.slotIds,
        purpose: bookingInfo.purpose,
        participants: bookingInfo.participants,
        isEvent: bookingInfo.isEvent || false,
      };
      
      // Thêm flag force và overrideReason nếu đang override
      if (isOverride) {
        bookingPayload.force = true;
        if (overrideReason?.trim()) {
          bookingPayload.overrideReason = overrideReason.trim();
        }
        console.log("[BookingActionModal] ⚠️ OVERRIDE MODE - Payload:", {
          ...bookingPayload,
          overrideReason: overrideReason?.trim() || "(empty)"
        });
      }
      
      console.log("[BookingActionModal] Creating booking with payload:", bookingPayload);
      const result = await api.createBooking(bookingPayload);

      handleClose();

      setTimeout(() => {
        try {
          onSuccess?.(result);
        } catch (callbackError) {
          console.error("[BookingActionModal] Error in onSuccess callback:", callbackError);
        }
      }, 100);
    } catch (e) {
      console.error("[BookingActionModal] Error creating booking:", e);

      const errorMessage = e.message || "Lỗi khi tạo đơn đặt phòng";

      // ⚠️ Nếu đang override mà vẫn bị lỗi conflict, có thể backend chưa hỗ trợ force
      if (isOverride) {
        const msgLower = errorMessage.toLowerCase();
        const isConflictError =
          errorMessage.includes("đã có lịch") ||
          errorMessage.includes("conflict") ||
          errorMessage.includes("xung đột") ||
          errorMessage.includes("không thể đặt phòng") ||
          errorMessage.includes("Trạng thái:") ||
          msgLower.includes("already") ||
          msgLower.includes("exist") ||
          msgLower.includes("schedule");

        if (isConflictError) {
          setError(
            `Backend chưa hỗ trợ đặt đè. Lỗi: ${errorMessage}\n\n` +
            `Gợi ý: Vui lòng hủy các booking trùng lịch trước, sau đó tạo booking mới.`
          );
          return;
        }
      }

      // Nếu không phải override, fallback như cũ
      const msgLower = errorMessage.toLowerCase();
      const isConflictError =
        errorMessage.includes("đã có lịch") ||
        errorMessage.includes("conflict") ||
        errorMessage.includes("xung đột") ||
        errorMessage.includes("không thể đặt phòng") ||
        errorMessage.includes("Trạng thái:") ||
        msgLower.includes("already") ||
        msgLower.includes("exist") ||
        msgLower.includes("schedule");

      if (isConflictError && !isOverride) {
        // Thay vì tạo fake conflict, gọi lại API để lấy conflict data đầy đủ
        try {
          console.log("[BookingActionModal] Conflict error detected, fetching full conflict data...");
          const conflicts = await checkConflicts(
            bookingInfo.facilityId,
            bookingInfo.startTime,
            bookingInfo.endTime
          );
          
          const facilityIdNum = Number(bookingInfo.facilityId);
          const blocking = (Array.isArray(conflicts) ? conflicts : []).filter((c) => {
            // Với conflict structure {booking1, booking2, facility, conflictType}
            // Cần kiểm tra cả booking1 và booking2 có conflict với facilityId đang đặt không
            const booking1 = c?.booking1;
            const booking2 = c?.booking2;
            const conflictFacilityId = c?.facility?.id || c?.facilityId;
            
            // Lấy facilityId từ booking1 và booking2
            const booking1FacilityId = booking1?.facilityId || booking1?.facility?.id;
            const booking2FacilityId = booking2?.facilityId || booking2?.facility?.id;
            
            // Kiểm tra xem có booking nào conflict với facility đang đặt không
            const booking1Matches = booking1FacilityId && Number(booking1FacilityId) === facilityIdNum;
            const booking2Matches = booking2FacilityId && Number(booking2FacilityId) === facilityIdNum;
            const facilityMatches = conflictFacilityId && Number(conflictFacilityId) === facilityIdNum;
            
            const hasMatchingFacility = booking1Matches || booking2Matches || facilityMatches;
            
            // Lấy status từ booking1 hoặc booking2 (ưu tiên booking có facilityId match)
            let status = null;
            if (booking1Matches && booking1?.status) {
              status = String(booking1.status).toUpperCase();
            } else if (booking2Matches && booking2?.status) {
              status = String(booking2.status).toUpperCase();
            } else {
              status = booking1?.status ? String(booking1.status).toUpperCase() : 
                      booking2?.status ? String(booking2.status).toUpperCase() : 
                      getStatusUpper(c);
            }
            
            const statusMatches = status === "APPROVED" || status === "PENDING";
            
            const matches = hasMatchingFacility && statusMatches;
            
            // Log để debug
            console.log("[BookingActionModal] Error handler - Checking conflict:", {
              conflict: c,
              booking1FacilityId,
              booking2FacilityId,
              conflictFacilityId,
              expectedFacilityId: facilityIdNum,
              booking1Status: booking1?.status,
              booking2Status: booking2?.status,
              extractedStatus: status,
              booking1Matches,
              booking2Matches,
              facilityMatches,
              hasMatchingFacility,
              statusMatches,
              matches
            });
            
            if (!matches) {
              console.log("[BookingActionModal] Error handler - Conflict filtered out:", {
                reason: !hasMatchingFacility ? "No matching facility ID" : "Status not APPROVED/PENDING",
                hasMatchingFacility,
                statusMatches
              });
            }
            
            return matches;
          });
          
          console.log("[BookingActionModal] Fetched conflicts from API:", conflicts);
          console.log("[BookingActionModal] Filtered blocking conflicts:", blocking);
          
          if (blocking.length > 0) {
            // Enrich conflict data nếu thiếu thông tin
            const enrichedConflicts = await Promise.all(blocking.map(async (conflict) => {
              const bookingId = getBookingIdFromConflict(conflict);
              const hasUserName = getUserNameFromConflict(conflict) && getUserNameFromConflict(conflict) !== "N/A";
              const hasTime = formatTime(conflict) && formatTime(conflict) !== "N/A";
              
              if (bookingId && bookingId !== "unknown" && bookingId !== null && (!hasUserName || !hasTime)) {
                try {
                  const numericId = Number(bookingId);
                  if (!isNaN(numericId) && numericId > 0) {
                    console.log("[BookingActionModal] Enriching conflict - Fetching booking detail for ID:", numericId);
                    const bookingDetail = await api.getBookingDetail(numericId);
                    return {
                      ...conflict,
                      ...bookingDetail,
                      userName: bookingDetail?.user?.fullName || bookingDetail?.user?.name || getUserNameFromConflict(conflict) || "N/A",
                      startTime: bookingDetail?.startTime || conflict?.startTime || conflict?.bookingStartTime,
                      endTime: bookingDetail?.endTime || conflict?.endTime || conflict?.bookingEndTime,
                      facility: bookingDetail?.facility || conflict?.facility,
                    };
                  }
                } catch (fetchError) {
                  console.warn("[BookingActionModal] Failed to fetch booking detail:", fetchError);
                }
              }
              return conflict;
            }));
            
            // Có conflict data đầy đủ từ API - mở modal override
            setError("");
            setConflictData(enrichedConflicts);
            setPreparedBookingData(bookingInfo);
            return;
          } else {
            // Không tìm thấy conflict từ API, nhưng backend báo conflict
            // Có thể conflict đã được resolve hoặc API không trả về đúng
            console.warn("[BookingActionModal] Backend reports conflict but API checkConflicts returned empty");
            setError(`Không thể đặt phòng: ${errorMessage}\n\nVui lòng thử lại sau vài giây hoặc kiểm tra lịch đặt phòng.`);
          }
        } catch (conflictFetchError) {
          console.error("[BookingActionModal] Error fetching conflicts:", conflictFetchError);
          setError(`Không thể đặt phòng: ${errorMessage}\n\nLỗi khi kiểm tra xung đột. Vui lòng thử lại.`);
        }
      }

      if (errorMessage.includes("403") || errorMessage.includes("Forbidden") || errorMessage.includes("không có quyền")) {
        setError("Bạn không có quyền tạo đơn đặt phòng. Vui lòng kiểm tra lại quyền truy cập.");
      } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("hết hạn")) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else {
        setError(errorMessage);
      }
    }
  };

  if (!isOpen) return null;
  // ⭐ NEW: MODAL XÁC NHẬN ĐẶT ĐÈ (TRƯỚC KHI MỞ MODAL GHI ĐÈ)
if (confirmOverrideOpen) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="max-w-xl w-full">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-yellow-600" />
          <h2 className="text-lg font-bold">Xác nhận đặt đè</h2>
        </div>

        <p className="text-sm mb-3">
          Khung giờ này đang có <b>{pendingConflicts.length}</b> booking:
        </p>

        <ul className="mb-4 list-disc list-inside text-sm">
          {pendingConflicts.map((c, i) => {
            const status = getStatusUpper(c);
            const badge = getBadgeMeta(status);
            return (
              <li key={i}>
                {getUserNameFromConflict(c)}{" "}
                <Badge type={badge.type}>{badge.label}</Badge>
              </li>
            );
          })}
        </ul>

        <p className="text-sm text-red-600 mb-4">
          Nếu tiếp tục, các booking trên sẽ bị <b>CANCELLED</b>.
        </p>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setConfirmOverrideOpen(false);
              setPendingConflicts([]);
            }}
          >
            Hủy
          </Button>

          <Button
            variant="danger"
            onClick={() => {
              setConfirmOverrideOpen(false);           // Đóng modal xác nhận
              setConflictData(pendingConflicts);       // Set conflicts để hiển thị trong modal override
              setPreparedBookingData(preparedBookingData || bookingData); // Đảm bảo có data
            }}
          >
            Xác nhận đặt đè
          </Button>
        </div>
      </Card>
    </div>
  );
}


  // ---------------- UI: conflict overlay ----------------
  if (conflictData && conflictData.length > 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Phát hiện xung đột lịch đặt phòng</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Khung giờ này đang có <strong>{conflictData.length}</strong> đơn (APPROVED/PENDING)
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                disabled={loading}
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  Admin có thể <strong>Ghi đè</strong>. Backend sẽ tự động chuyển các đơn trùng sang <strong>CANCELLED</strong>.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Danh sách đơn bị trùng ({conflictData.length} đơn):
                </label>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Tên SV</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Thời gian</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {conflictData.map((conflict, idx) => {
                        const booking = pickBookingFromConflict(conflict);
                        const userName = getUserNameFromConflict(conflict);
                        const statusUpper = getStatusUpper(conflict);
                        const badge = getBadgeMeta(statusUpper);

                        // Lấy thông tin thời gian từ nhiều nguồn
                        const conflictForTime = {
                          ...conflict,
                          ...booking,
                          startTime: booking?.startTime || conflict?.startTime || conflict?.bookingStartTime,
                          endTime: booking?.endTime || conflict?.endTime || conflict?.bookingEndTime,
                          date: booking?.date || conflict?.date,
                        };

                        const formattedTime = formatTime(conflictForTime);
                        const displayName = userName && userName !== "N/A" ? userName : (conflict?.message || "Không xác định");
                        const displayTime = formattedTime && formattedTime !== "N/A" ? formattedTime : "Không xác định";

                        const key = conflict?.id || booking?.id || `${userName}-${statusUpper}-${idx}`;

                        return (
                          <tr key={key} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              {displayName !== "Không xác định" ? (
                                displayName
                              ) : (
                                <span className="text-gray-400 italic">
                                  {conflict?.facility?.name || conflict?.roomName || "Phòng không xác định"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {displayTime !== "N/A" ? (
                                displayTime
                              ) : (
                                <span className="text-gray-400 italic">Chưa có thông tin</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Badge type={badge.type}>{badge.label}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do ghi đè <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ví dụ: Lấy phòng họp khẩn cấp..."
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  (Hiện tại lý do này chỉ hiển thị ở FE. Nếu muốn lưu vào history/email, cần BE nhận reason trong API create.)
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={handleClose} disabled={loading}>
                Quay lại
              </Button>
              <Button variant="danger" onClick={handleOverride} disabled={loading || !overrideReason.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang ghi đè...
                  </>
                ) : (
                  "Xác nhận Ghi đè"
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ---------------- UI: create form ----------------
  const todayYMD = toDateISO_Local(new Date());
  const selectedRoom = rooms.find((r) => r.id === Number(formData.facilityId));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tạo lịch đặt phòng mới</h2>
              <p className="text-sm text-gray-500 mt-1">Điền thông tin để tạo đơn đặt phòng</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  Phòng <span className="text-red-500">*</span>
                </label>
                {loadingRooms ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tải danh sách phòng...
                  </div>
                ) : (
                  <select
                    value={formData.facilityId}
                    onChange={(e) => setFormData({ ...formData, facilityId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    disabled={loading}
                  >
                    <option value="">-- Chọn phòng --</option>
                    {rooms.map((room) => {
                      const typeName =
                        typeof room.type === "object"
                          ? room.type?.name || room.type?.type || "Unknown"
                          : room.type || "Unknown";

                      const roomStatus = room.status || room.facilityStatus || "";
                      const statusUpper = String(roomStatus).toUpperCase();
                      const isMaintenance = statusUpper === "MAINTENANCE";
                      const isInactive = statusUpper === "INACTIVE";

                      let statusLabel = "";
                      if (isMaintenance) statusLabel = " [🔧 Bảo trì]";
                      else if (isInactive) statusLabel = " [⛔ Ngưng hoạt động]";

                      return (
                        <option
                          key={room.id}
                          value={room.id}
                          disabled={isMaintenance || isInactive}
                        >
                          {room.name} ({room.capacity || 0} người) - {typeName}
                          {statusLabel}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Ngày <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={todayYMD}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Chọn Slot (mỗi slot = 2 tiếng) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SLOT_MAPPING).map(([slotId, slotInfo]) => {
                    const isSelected = formData.selectedSlots.includes(Number(slotId));
                    return (
                      <label
                        key={slotId}
                        className={`
                          flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all
                          ${isSelected ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300 bg-white"}
                          ${loading ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSlot(Number(slotId))}
                          disabled={loading}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className={`text-sm font-medium ${isSelected ? "text-orange-700" : "text-gray-700"}`}>
                          {slotInfo.label}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {formData.selectedSlots.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Đã chọn {formData.selectedSlots.length} slot: {formData.selectedSlots.join(", ")}
                  </p>
                )}

                {checkingConflicts && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang kiểm tra xung đột...</span>
                  </div>
                )}

                {!checkingConflicts && previewConflicts.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">
                          Có {previewConflicts.length} đơn (APPROVED/PENDING) trong khung giờ này
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Bạn có thể vào trang "Duyệt yêu cầu" để xem, hoặc bấm "Tạo đơn" để hệ thống hiển thị màn hình ghi đè.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => {
                            handleClose();
                            navigate("/admin-facility/approvals");
                          }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Mở trang Duyệt yêu cầu
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  Số người tham gia
                </label>
                <input
                  type="number"
                  value={formData.participants}
                  onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                  min="1"
                  max={selectedRoom?.capacity || 999}
                  placeholder="Nhập số người"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  disabled={loading}
                />
                {selectedRoom && (
                  <p className="text-xs text-gray-500 mt-1">Sức chứa tối đa: {selectedRoom.capacity || 0} người</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Mục đích sử dụng
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  rows="3"
                  placeholder="Nhập mục đích sử dụng phòng..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
                  disabled={loading}
                />
              </div>

              {previewConflicts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Lý do ghi đè <span className="text-xs text-gray-500">(auto-fill cho bước xác nhận)</span>
                  </label>
                  <textarea
                    value={formData.rejectReason}
                    onChange={(e) => setFormData({ ...formData, rejectReason: e.target.value })}
                    rows="3"
                    placeholder="Ví dụ: Lấy phòng họp khẩn cấp..."
                    className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none bg-orange-50"
                    disabled={loading}
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Tạo đơn đặt phòng"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
