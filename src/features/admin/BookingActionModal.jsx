import { useState, useEffect, useRef } from "react";
import { AlertTriangle, X, Loader2, Calendar, Clock, Users, FileText, Building2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { checkConflicts, rejectBookingWithReason } from "../../services/adminService";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function BookingActionModal({
  isOpen,
  onClose,
  onSuccess,
  bookingData, // { facilityId, date, slotIds, purpose, participants, startTime, endTime }
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conflictData, setConflictData] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preparedBookingData, setPreparedBookingData] = useState(null); // Lưu bookingData đã prepare
  const [previewConflicts, setPreviewConflicts] = useState([]); // Conflicts khi chọn slot (để hiển thị thông báo)
  const [checkingConflicts, setCheckingConflicts] = useState(false); // Đang check conflicts
  const isCreatingRef = useRef(false); // Ref để track xem đang tạo booking không (prevent duplicate)
  
  // Form state (khi chưa có bookingData)
  const [formData, setFormData] = useState({
    facilityId: "",
    date: "",
    selectedSlots: [], // Array of slot numbers [1, 2, 3, ...]
    purpose: "",
    participants: "",
    rejectReason: "", // Lý do từ chối đơn trùng (gửi cho user)
  });
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Slot mapping: mỗi slot = 2 tiếng
  const SLOT_MAPPING = {
    1: { start: 7, end: 9, label: "Slot 1 (07:00 - 09:00)" },
    2: { start: 9, end: 11, label: "Slot 2 (09:00 - 11:00)" },
    3: { start: 11, end: 13, label: "Slot 3 (11:00 - 13:00)" },
    4: { start: 13, end: 15, label: "Slot 4 (13:00 - 15:00)" },
    5: { start: 15, end: 17, label: "Slot 5 (15:00 - 17:00)" },
  };

  // Load danh sách phòng khi mở modal
  useEffect(() => {
    if (isOpen && !bookingData) {
      loadRooms();
    }
  }, [isOpen, bookingData]);

  // Check conflicts khi có đủ thông tin (phòng, ngày, slot)
  useEffect(() => {
    if (!isOpen || bookingData) {
      setPreviewConflicts([]);
      return;
    }
    
    const hasRequiredInfo = formData.facilityId && formData.date && formData.selectedSlots.length > 0;
    if (!hasRequiredInfo) {
      setPreviewConflicts([]);
      return;
    }

    // Debounce: đợi 500ms sau khi user ngừng chọn slot
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
    } catch (error) {
      console.error("[BookingActionModal] Error loading rooms:", error);
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Reset state khi đóng modal
  const handleClose = () => {
    setConflictData(null);
    setOverrideReason("");
    setError("");
    setLoading(false);
    setPreparedBookingData(null);
    isCreatingRef.current = false; // Reset ref
    setFormData({
      facilityId: "",
      date: "",
      selectedSlots: [],
      purpose: "",
      participants: "",
      rejectReason: "",
    });
    onClose();
  };

  // Validate và chuẩn bị bookingData từ form
  const prepareBookingData = () => {
    if (bookingData) return bookingData;

    // Validate form
    if (!formData.facilityId || !formData.date || !formData.selectedSlots || formData.selectedSlots.length === 0) {
      setError("Vui lòng điền đầy đủ thông tin: Phòng, Ngày, và chọn ít nhất 1 slot");
      return null;
    }

    // Sắp xếp slotIds theo thứ tự tăng dần
    const sortedSlotIds = [...formData.selectedSlots].sort((a, b) => a - b);
    
    // Tính startTime và endTime từ slot đầu tiên và cuối cùng
    const firstSlot = SLOT_MAPPING[sortedSlotIds[0]];
    const lastSlot = SLOT_MAPPING[sortedSlotIds[sortedSlotIds.length - 1]];
    
    const startDateTime = new Date(`${formData.date}T${String(firstSlot.start).padStart(2, '0')}:00:00`);
    const endDateTime = new Date(`${formData.date}T${String(lastSlot.end).padStart(2, '0')}:00:00`);

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

  // Check conflicts để preview (không block, chỉ thông báo)
  const checkPreviewConflicts = async () => {
    if (!formData.facilityId || !formData.date || formData.selectedSlots.length === 0) {
      setPreviewConflicts([]);
      return;
    }

    setCheckingConflicts(true);
    try {
      // Tính startTime và endTime từ slot đầu và cuối
      const sortedSlotIds = [...formData.selectedSlots].sort((a, b) => a - b);
      const firstSlot = SLOT_MAPPING[sortedSlotIds[0]];
      const lastSlot = SLOT_MAPPING[sortedSlotIds[sortedSlotIds.length - 1]];
      
      const startDateTime = new Date(`${formData.date}T${String(firstSlot.start).padStart(2, '0')}:00:00`);
      const endDateTime = new Date(`${formData.date}T${String(lastSlot.end).padStart(2, '0')}:00:00`);

      const conflicts = await checkConflicts(
        Number(formData.facilityId),
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );

      // Filter chỉ lấy conflicts của phòng này và PENDING
      const pendingConflicts = conflicts.filter(conflict => {
        const conflictFacilityId = conflict.facilityId || conflict.facility?.id;
        const matchesFacility = conflictFacilityId === Number(formData.facilityId) || Number(conflictFacilityId) === Number(formData.facilityId);
        const status = conflict.status?.toUpperCase();
        const isPending = status === 'PENDING' || status === 'CHỜ DUYỆT';
        return matchesFacility && isPending;
      });

      setPreviewConflicts(pendingConflicts);
      console.log("[BookingActionModal] Preview conflicts:", pendingConflicts.length);
    } catch (error) {
      console.error("[BookingActionModal] Error checking preview conflicts:", error);
      setPreviewConflicts([]);
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Toggle slot selection
  const toggleSlot = (slotId) => {
    setFormData(prev => {
      const newSlots = prev.selectedSlots.includes(slotId)
        ? prev.selectedSlots.filter(id => id !== slotId)
        : [...prev.selectedSlots, slotId].sort((a, b) => a - b);
      return { ...prev, selectedSlots: newSlots };
    });
  };

  // Bước 1: Pre-check conflicts
  const handleCreate = async () => {
    // Prevent multiple clicks - dùng ref để check ngay lập tức
    if (loading || isCreatingRef.current) {
      console.warn("[BookingActionModal] ⚠️ Already processing, ignoring duplicate click");
      return;
    }

    const data = prepareBookingData();
    if (!data) return;

    isCreatingRef.current = true;
    setLoading(true);
    setError("");

    try {
      // Kiểm tra conflicts
      const conflicts = await checkConflicts(
        data.facilityId,
        data.startTime,
        data.endTime
      );

      console.log("[BookingActionModal] Conflicts found:", conflicts.length);
      console.log("[BookingActionModal] Selected facilityId:", data.facilityId);

      // Filter conflicts:
      // 1. Chỉ lấy conflicts của phòng đang chọn (facilityId)
      // 2. Chỉ lấy các booking PENDING (đang chờ duyệt) - vì chỉ có thể reject PENDING
      // API trả về conflict với structure: {booking1, booking2, facility, conflictType}
      const pendingConflicts = conflicts.filter(conflict => {
        // Lấy booking đang bị conflict (booking1 hoặc booking2)
        const booking = conflict.booking1 || conflict.booking2;
        
        // Kiểm tra facilityId - có thể ở conflict.facilityId, conflict.facility?.id, hoặc booking.facilityId
        const conflictFacilityId = booking?.facilityId || 
          conflict.facilityId || 
          conflict.facility?.id ||
          booking?.facility?.id;
        const matchesFacility = conflictFacilityId === data.facilityId || Number(conflictFacilityId) === Number(data.facilityId);
        
        // Kiểm tra status - có thể ở booking.status hoặc conflict.status
        const status = (booking?.status || conflict.status || '').toUpperCase();
        const isPending = status === 'PENDING' || status === 'CHỜ DUYỆT' || conflict.conflictType === 'PENDING_CONFLICT';
        
        return matchesFacility && isPending;
      });

      console.log("[BookingActionModal] Pending conflicts for facility", data.facilityId + ":", pendingConflicts.length, "out of", conflicts.length);
      if (pendingConflicts.length > 0) {
        console.log("[BookingActionModal] Conflict sample:", pendingConflicts[0]);
        console.log("[BookingActionModal] Conflict sample keys:", Object.keys(pendingConflicts[0]));
        console.log("[BookingActionModal] Conflict sample user:", pendingConflicts[0].user);
        console.log("[BookingActionModal] Conflict sample facility:", pendingConflicts[0].facility);
      }
      
      // Nếu conflicts không có đủ thông tin, thử lấy thông tin chi tiết từ API khác
      // (Có thể cần gọi GET /bookings/{id} để lấy đầy đủ thông tin)
      // Tạm thời giữ nguyên logic hiện tại, chỉ cải thiện mapping

      // Nếu không có conflict PENDING của phòng này, tạo booking ngay
      if (!pendingConflicts || pendingConflicts.length === 0) {
        // Vẫn check conflicts trước khi tạo để tránh backend throw error
        try {
          await createBooking(data);
        } catch (createError) {
          // Nếu createBooking fail với conflict error, sẽ được handle trong createBooking function
          // Không cần làm gì thêm ở đây vì createBooking đã handle
          console.log("[BookingActionModal] createBooking failed, error handled in createBooking function");
        }
        return;
      }

      // Nếu có conflict PENDING, hiển thị UI xung đột để admin có thể ghi đè
      // Admin facility có quyền ghi đè, nên luôn hiển thị modal override
      console.log("[BookingActionModal] Setting conflict data:", pendingConflicts);
      console.log("[BookingActionModal] First conflict sample:", pendingConflicts[0]);
      if (pendingConflicts[0]) {
        console.log("[BookingActionModal] First conflict full structure:", JSON.stringify(pendingConflicts[0], null, 2));
        console.log("[BookingActionModal] booking1:", pendingConflicts[0].booking1);
        console.log("[BookingActionModal] booking2:", pendingConflicts[0].booking2);
      }
      
      setConflictData(pendingConflicts);
      // Lưu bookingData để dùng sau khi override
      setPreparedBookingData(data);
      // Tự động điền lý do từ form (nếu có)
      if (formData.rejectReason) {
        setOverrideReason(formData.rejectReason);
      }
    } catch (error) {
      console.error("[BookingActionModal] Error checking conflicts:", error);
      setError(error.message || "Lỗi khi kiểm tra xung đột lịch");
      isCreatingRef.current = false;
    } finally {
      // Chỉ reset nếu không có conflict (vì nếu có conflict sẽ chuyển sang modal override)
      if (!conflictData || conflictData.length === 0) {
        setLoading(false);
        isCreatingRef.current = false;
      }
    }
  };

  // Bước 2: Xử lý Ghi đè
  const handleOverride = async () => {
    // Prevent multiple clicks - dùng ref để check ngay lập tức
    if (loading || isCreatingRef.current) {
      console.warn("[BookingActionModal] ⚠️ Already processing override, ignoring duplicate click");
      return;
    }

    if (!overrideReason.trim()) {
      setError("Vui lòng nhập lý do hủy đơn cũ & Ghi đè");
      return;
    }

    if (!conflictData || conflictData.length === 0) {
      setError("Không có danh sách xung đột");
      return;
    }

    isCreatingRef.current = true;
    setLoading(true);
    setError("");

    try {
      // Bước 2.1: Reject tất cả các booking bị conflict
      console.log("[BookingActionModal] Rejecting", conflictData.length, "conflicting bookings...");
      
      const rejectPromises = conflictData.map((conflict) => {
        // Lấy booking ID từ booking1 hoặc booking2 hoặc conflict.id
        const booking = conflict.booking1 || conflict.booking2;
        const bookingId = booking?.id || conflict.id || conflict.bookingId;
        console.log("[BookingActionModal] Rejecting booking:", bookingId, "from conflict:", conflict);
        return rejectBookingWithReason(bookingId, overrideReason.trim());
      });

      await Promise.all(rejectPromises);
      console.log("[BookingActionModal] ✅ All conflicting bookings rejected");

      // Bước 2.2: Tạo booking mới
      const currentBookingData = preparedBookingData || bookingData;
      await createBooking(currentBookingData);
    } catch (error) {
      console.error("[BookingActionModal] Error during override:", error);
      setError(error.message || "Lỗi khi ghi đè lịch đặt phòng");
      setLoading(false);
      isCreatingRef.current = false;
    }
  };

  // Tạo booking mới
  const createBooking = async (data = null) => {
    // Prevent duplicate calls - dùng ref để check ngay lập tức
    if (isCreatingRef.current) {
      console.warn("[BookingActionModal] ⚠️ Already creating booking, ignoring duplicate call");
      return;
    }

    const bookingInfo = data || bookingData || preparedBookingData;
    if (!bookingInfo) {
      setError("Thiếu thông tin đặt phòng");
      setLoading(false);
      isCreatingRef.current = false;
      return;
    }

    isCreatingRef.current = true;
    try {
      console.log("[BookingActionModal] Creating new booking...");
      console.log("[BookingActionModal] Booking data:", bookingInfo);
      console.log("[BookingActionModal] Timestamp:", new Date().toISOString());
      
      const result = await api.createBooking({
        facilityId: bookingInfo.facilityId,
        date: bookingInfo.date,
        slotIds: bookingInfo.slotIds,
        purpose: bookingInfo.purpose,
        participants: bookingInfo.participants,
        isEvent: bookingInfo.isEvent || false,
      });

      console.log("[BookingActionModal] ✅ Booking created successfully:", result);

      // Thành công - đóng modal trước khi gọi onSuccess
      isCreatingRef.current = false;
      handleClose();
      
      // Gọi onSuccess sau một chút để đảm bảo modal đã đóng
      setTimeout(() => {
        if (onSuccess) {
          try {
            onSuccess(result);
          } catch (callbackError) {
            console.error("[BookingActionModal] Error in onSuccess callback:", callbackError);
            // Không throw để không ảnh hưởng đến flow
          }
        }
      }, 100);
    } catch (error) {
      isCreatingRef.current = false;
      console.error("[BookingActionModal] Error creating booking:", error);
      
      const errorMessage = error.message || "Lỗi khi tạo đơn đặt phòng";
      
      // Kiểm tra nếu là lỗi conflict từ backend
      // Backend có thể trả về error về conflict thay vì success
      // Kiểm tra nhiều pattern để catch tất cả các error về conflict
      const errorLower = errorMessage.toLowerCase();
      const isConflictError = 
        errorMessage.includes('đã có lịch') || 
        errorMessage.includes('PENDING') || 
        errorMessage.includes('conflict') || 
        errorMessage.includes('xung đột') ||
        errorMessage.includes('không thể đặt phòng') ||
        errorMessage.includes('Trạng thái:') ||
        errorMessage.includes('Bạn không thể') ||
        errorLower.includes('booking') && (errorLower.includes('exist') || errorLower.includes('already') || errorLower.includes('conflict')) ||
        errorLower.includes('schedule') && errorLower.includes('already');
      
      if (isConflictError) {
        console.log("[BookingActionModal] Backend trả về conflict error, tự động check conflicts và hiển thị modal override");
        console.log("[BookingActionModal] Error message:", errorMessage);
        
        // Tự động check conflicts và hiển thị modal override
        try {
          const conflicts = await checkConflicts(
            bookingInfo.facilityId,
            bookingInfo.startTime,
            bookingInfo.endTime
          );

          const pendingConflicts = conflicts.filter(conflict => {
            // Lấy booking đang bị conflict
            const booking = conflict.booking1 || conflict.booking2;
            const conflictFacilityId = booking?.facilityId || conflict.facilityId || conflict.facility?.id;
            const matchesFacility = conflictFacilityId === bookingInfo.facilityId || Number(conflictFacilityId) === Number(bookingInfo.facilityId);
            const status = (booking?.status || conflict.status || '').toUpperCase();
            const isPending = status === 'PENDING' || status === 'CHỜ DUYỆT' || conflict.conflictType === 'PENDING_CONFLICT';
            return matchesFacility && isPending;
          });

          if (pendingConflicts.length > 0) {
            console.log("[BookingActionModal] Found", pendingConflicts.length, "pending conflicts, showing override modal");
            // Clear error TRƯỚC khi set conflict data
            setError("");
            setConflictData(pendingConflicts);
            setPreparedBookingData(bookingInfo);
            if (formData.rejectReason) {
              setOverrideReason(formData.rejectReason);
            }
            setLoading(false);
            return; // Không hiển thị error, chuyển sang modal override
          } else {
            // Nếu không tìm thấy conflicts qua API, vẫn hiển thị modal override với thông báo
            console.log("[BookingActionModal] No conflicts found via API, but backend returned conflict error. Showing override option anyway.");
            // Tạo một conflict object giả để hiển thị modal
            // Clear error TRƯỚC
            setError("");
            setConflictData([{
              id: 'unknown',
              facilityName: errorMessage.match(/tại\s+([^\s(]+)/)?.[1] || 'Phòng này',
              status: 'PENDING',
              message: errorMessage
            }]);
            setPreparedBookingData(bookingInfo);
            if (formData.rejectReason) {
              setOverrideReason(formData.rejectReason);
            }
            setLoading(false);
            return;
          }
        } catch (conflictError) {
          console.error("[BookingActionModal] Error checking conflicts after API error:", conflictError);
          // Nếu check conflicts cũng fail, vẫn hiển thị modal override với error message
          // Clear error TRƯỚC
          setError("");
          setConflictData([{
            id: 'unknown',
            facilityName: 'Phòng này',
            status: 'PENDING',
            message: errorMessage
          }]);
          setPreparedBookingData(bookingInfo);
          if (formData.rejectReason) {
            setOverrideReason(formData.rejectReason);
          }
          setLoading(false);
          return;
        }
      }
      
      // Kiểm tra nếu là lỗi authentication (401/403)
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('không có quyền')) {
        setError("Bạn không có quyền tạo đơn đặt phòng. Vui lòng kiểm tra lại quyền truy cập.");
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('hết hạn')) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else {
        setError(errorMessage);
      }
      setLoading(false);
    }
  };

  // Format time - xử lý linh hoạt các format từ API
  const formatTime = (conflict) => {
    // Debug log để xem conflict structure
    if (!conflict.startTime && !conflict.endTime) {
      console.log("[formatTime] Conflict missing time fields:", {
        id: conflict.id,
        keys: Object.keys(conflict),
        conflict: conflict
      });
    }
    
    // Thử nhiều cách lấy startTime và endTime
    let startTime = conflict.startTime || 
      conflict.start || 
      conflict.timeStart || 
      conflict.bookings?.[0]?.startTime || 
      conflict.bookings?.[0]?.start ||
      conflict.bookingStartTime ||
      conflict.booking?.startTime;
      
    let endTime = conflict.endTime || 
      conflict.end || 
      conflict.timeEnd || 
      conflict.bookings?.[0]?.endTime || 
      conflict.bookings?.[0]?.end ||
      conflict.bookingEndTime ||
      conflict.booking?.endTime;
    
    // Nếu có date riêng, kết hợp với time
    if (conflict.date && !startTime) {
      // Có thể có date + time riêng
      const date = conflict.date;
      if (conflict.start) {
        startTime = `${date}T${conflict.start}`;
      }
      if (conflict.end) {
        endTime = `${date}T${conflict.end}`;
      }
    }
    
    // Nếu có slot, tính time từ slot
    if (!startTime && conflict.slot) {
      const slotNum = Number(conflict.slot);
      if (slotNum >= 1 && slotNum <= 5) {
        const slotInfo = SLOT_MAPPING[slotNum];
        if (slotInfo && conflict.date) {
          startTime = `${conflict.date}T${String(slotInfo.start).padStart(2, '0')}:00:00`;
          endTime = `${conflict.date}T${String(slotInfo.end).padStart(2, '0')}:00:00`;
        }
      }
    }

    if (!startTime || !endTime) {
      console.log("[formatTime] Missing time data:", { startTime, endTime, conflict });
      return "N/A";
    }

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      // Kiểm tra valid date
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.log("[formatTime] Invalid date:", { startTime, endTime });
        return "N/A";
      }

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
    } catch (error) {
      console.error("[formatTime] Error:", error, { conflict, startTime, endTime });
      return "N/A";
    }
  };

  if (!isOpen) return null;

  // Nếu đang hiển thị conflict overlay
  if (conflictData && conflictData.length > 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Phát hiện xung đột lịch đặt phòng</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Khung giờ này đang có <strong>{conflictData.length}</strong> đơn đặt phòng
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

            {/* Body */}
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  Bạn có muốn <strong>HỦY</strong> các đơn này để <strong>Ghi đè</strong> không?
                </p>
              </div>

              {/* Danh sách xung đột */}
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
                      {conflictData.map((conflict) => {
                        // Debug: Log conflict data để xem cấu trúc
                        if (conflict.id === conflictData[0]?.id || conflict === conflictData[0]) {
                          console.log("[BookingActionModal] Rendering conflict:", conflict);
                          console.log("[BookingActionModal] Conflict keys:", Object.keys(conflict));
                          console.log("[BookingActionModal] booking1:", conflict.booking1);
                          console.log("[BookingActionModal] booking2:", conflict.booking2);
                        }
                        
                        // API trả về conflict với structure: {booking1, booking2, facility, conflictType}
                        // Cần lấy thông tin từ booking1 hoặc booking2 (booking đang bị conflict)
                        const booking = conflict.booking1 || conflict.booking2 || conflict;
                        
                        // Xử lý tên người dùng linh hoạt - kiểm tra nhiều field
                        const userName = booking.userName || 
                          booking.user?.fullName || 
                          booking.user?.name ||
                          conflict.userName ||
                          conflict.user?.fullName ||
                          conflict.user?.name ||
                          booking.requesterName ||
                          booking.requester?.name ||
                          booking.requester?.fullName ||
                          conflict.requesterName ||
                          conflict.requester?.name ||
                          conflict.requester?.fullName ||
                          booking.bookings?.[0]?.user?.fullName ||
                          booking.bookings?.[0]?.user?.name ||
                          conflict.bookings?.[0]?.user?.fullName ||
                          conflict.bookings?.[0]?.user?.name ||
                          booking.createdBy?.fullName ||
                          booking.createdBy?.name ||
                          conflict.createdBy?.fullName ||
                          conflict.createdBy?.name ||
                          "N/A";

                        // Tạo conflict object để formatTime có thể xử lý
                        const conflictForTime = {
                          ...conflict,
                          ...booking, // Merge booking data vào conflict
                          startTime: booking.startTime || conflict.startTime,
                          endTime: booking.endTime || conflict.endTime,
                          date: booking.date || conflict.date,
                        };

                        return (
                          <tr key={conflict.id || conflict.bookingId || booking.id || Math.random()} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              {userName}
                            </td>
                          <td className="px-3 py-2 text-gray-600">
                            {formatTime(conflictForTime)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              type={
                                conflict.status === "APPROVED" || conflict.status === "approved"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {conflict.status === "APPROVED" || conflict.status === "approved"
                                ? "Đã duyệt"
                                : "Chờ duyệt"}
                            </Badge>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Nhập lý do */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do hủy đơn cũ & Ghi đè <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ví dụ: Lấy phòng họp khẩn cấp..."
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Quay lại
              </Button>
              <Button
                variant="danger"
                onClick={handleOverride}
                disabled={loading || !overrideReason.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang dọn dẹp đơn cũ...
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

  // Modal form đặt phòng (khi chưa có bookingData)
  const todayYMD = new Date().toISOString().split('T')[0];
  const selectedRoom = rooms.find(r => r.id === Number(formData.facilityId));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4">
              {/* Chọn phòng */}
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
                      const typeName = typeof room.type === 'object' 
                        ? (room.type?.name || room.type?.type || 'Unknown')
                        : (room.type || 'Unknown');
                      
                      // Kiểm tra trạng thái phòng
                      const roomStatus = room.status || room.facilityStatus || '';
                      const statusUpper = String(roomStatus).toUpperCase();
                      const isMaintenance = statusUpper === 'MAINTENANCE' || roomStatus === 'maintenance';
                      const isInactive = statusUpper === 'INACTIVE' || roomStatus === 'inactive';
                      
                      // Tạo label với đánh dấu trạng thái
                      let statusLabel = '';
                      if (isMaintenance) {
                        statusLabel = ' [🔧 Bảo trì]';
                      } else if (isInactive) {
                        statusLabel = ' [⛔ Ngưng hoạt động]';
                      }
                      
                      return (
                        <option 
                          key={room.id} 
                          value={room.id}
                          disabled={isMaintenance || isInactive}
                          style={{
                            color: isMaintenance ? '#f59e0b' : isInactive ? '#ef4444' : undefined
                          }}
                        >
                          {room.name} ({room.capacity || 0} người) - {typeName}{statusLabel}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Chọn ngày */}
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

              {/* Chọn Slot */}
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
                          ${isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSlot(Number(slotId))}
                          disabled={loading}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className={`text-sm font-medium ${isSelected ? 'text-orange-700' : 'text-gray-700'}`}>
                          {slotInfo.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {formData.selectedSlots.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Đã chọn {formData.selectedSlots.length} slot: {formData.selectedSlots.join(', ')}
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
                          Có {previewConflicts.length} đơn đặt phòng đang chờ duyệt trong khung giờ này
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Bạn có thể vào trang "Duyệt yêu cầu" để từ chối các đơn này trước khi tạo đơn mới, hoặc tiếp tục tạo đơn để ghi đè.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => {
                            handleClose();
                            navigate('/admin-facility/approvals');
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

              {/* Số người tham gia */}
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
                  <p className="text-xs text-gray-500 mt-1">
                    Sức chứa tối đa: {selectedRoom.capacity || 0} người
                  </p>
                )}
              </div>

              {/* Mục đích */}
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

              {/* Lý do từ chối đơn trùng (nếu có) */}
              {previewConflicts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Lý do từ chối đơn trùng <span className="text-xs text-gray-500">(Gửi cho user khi ghi đè)</span>
                  </label>
                  <textarea
                    value={formData.rejectReason}
                    onChange={(e) => setFormData({ ...formData, rejectReason: e.target.value })}
                    rows="3"
                    placeholder="Ví dụ: Lấy phòng họp khẩn cấp, cần phòng cho sự kiện quan trọng..."
                    className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none bg-orange-50"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lý do này sẽ được gửi cho user khi đơn của họ bị từ chối do ghi đè
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang kiểm tra...
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

