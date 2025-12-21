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
    const conflicts = await checkConflicts(
      data.facilityId,
      data.startTime,
      data.endTime
    );

    const facilityIdNum = Number(data.facilityId);

    const blocking = (Array.isArray(conflicts) ? conflicts : []).filter((c) => {
      const fId = Number(getFacilityIdFromConflict(c));
      const status = getStatusUpper(c);
      return (
        fId === facilityIdNum &&
        (status === "APPROVED" || status === "PENDING")
      );
    });

    // ⭐ NEW: nếu có conflict → MỞ MODAL XÁC NHẬN TRƯỚC
    if (blocking.length > 0) {
      setPendingConflicts(blocking);        // ⭐ NEW
      setPreparedBookingData(data);
      setConfirmOverrideOpen(true);         // ⭐ NEW
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


  // ✅ Override: only call createBooking (BE will cancel both approved+pending)
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

    // NOTE: reason currently is FE-only (BE create endpoint doesn't accept reason in your code)
    // If you later add reason to BE, you can include it into payload.

    inFlightRef.current = true;
    setLoading(true);
    setError("");

    try {
      // Truyền flag isOverride = true để backend biết đây là đặt đè
      await createBooking(data, true);
    } catch (e) {
      console.error("[BookingActionModal] Error during override:", e);
      setError(e.message || "Lỗi khi ghi đè lịch đặt phòng");
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
      }
      
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

      // If backend still returns a conflict-like message, show override overlay anyway
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
        // fallback: show overlay with a fake item
        setError("");
        setConflictData([
          {
            id: "unknown",
            status: "PENDING",
            message: errorMessage,
          },
        ]);
        setPreparedBookingData(bookingInfo);
        return;
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
              setConfirmOverrideOpen(false);      // ⭐ NEW
              setConflictData(pendingConflicts); // ⭐ NEW → mở modal ghi đè cũ
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
                      {conflictData.map((conflict) => {
                        const booking = pickBookingFromConflict(conflict);
                        const userName = getUserNameFromConflict(conflict);
                        const statusUpper = getStatusUpper(conflict);
                        const badge = getBadgeMeta(statusUpper);

                        const conflictForTime = {
                          ...conflict,
                          ...booking,
                          startTime: booking?.startTime || conflict?.startTime,
                          endTime: booking?.endTime || conflict?.endTime,
                          date: booking?.date || conflict?.date,
                        };

                        const key = conflict?.id || booking?.id || `${userName}-${statusUpper}-${Math.random()}`;

                        return (
                          <tr key={key} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{userName}</td>
                            <td className="px-3 py-2 text-gray-600">{formatTime(conflictForTime)}</td>
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
