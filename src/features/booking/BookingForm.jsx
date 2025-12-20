import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { getMyBookings } from "../../services/bookingService";
import Button from "../../components/ui/Button";
import { Calendar, Users, FileText, AlertCircle, Loader2, CalendarCheck } from "lucide-react";
import { toDateISO_Local, buildDateTimeVN } from "../../lib/utils";

export default function BookingForm({ 
  room, 
  facilityDetail, 
  selectedSlots, 
  selectedDate, 
  onSuccess, 
  onCancel 
}) {
  const { user } = useAuth();
  const [purpose, setPurpose] = useState("");
  const [participants, setParticipants] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userBookings, setUserBookings] = useState([]);
  const [conflictWarning, setConflictWarning] = useState("");
  const [checkingConflict, setCheckingConflict] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate
    if (!purpose.trim()) {
      setError("Vui lòng nhập mục đích sử dụng");
      setLoading(false);
      return;
    }

    if (!participants || parseInt(participants) < 1) {
      setError("Vui lòng nhập số lượng người tham gia (tối thiểu 1)");
      setLoading(false);
      return;
    }

    if (selectedSlots.length === 0) {
      setError("Vui lòng chọn ít nhất 1 slot");
      setLoading(false);
      return;
    }

    // Validate slot không được là quá khứ hoặc đang diễn ra
    const bookingDate = selectedDate || toDateISO_Local(new Date());
    const timeRange = calculateTimeRange(bookingDate, selectedSlots);
    if (timeRange) {
      const now = new Date();
      // Kiểm tra nếu slot đã qua hoặc đang diễn ra
      if (timeRange.startTime < now) {
        const slotLabel = selectedSlots.map(id => `Slot ${id}`).join(", ");
        setError(`Không thể đặt ${slotLabel} vì slot này đã qua hoặc đang diễn ra.`);
        setLoading(false);
        return;
      }

      // Validate conflict trước khi submit
      const conflict = checkUserConflict(timeRange.startTime, timeRange.endTime, userBookings);
      if (conflict) {
        const conflictRoom = conflict.facility?.name || conflict.facilityName || "phòng khác";
        setError(
          `Bạn không thể đặt phòng vì đã có lịch tại ${conflictRoom} (Trạng thái: ${conflict.status}) trong khung giờ này.`
        );
        setLoading(false);
        return;
      }
    }

    try {
      console.log('[BookingForm] Submitting booking:', {
        facilityId: room.id,
       date: selectedDate || toDateISO_Local(new Date()),
        slotIds: selectedSlots,
        purpose: purpose.trim(),
        participants: parseInt(participants),
        isEvent: false // Student booking, not event
      });

      const result = await api.createBooking({
        facilityId: room.id,
       date: selectedDate || toDateISO_Local(new Date()),
        slotIds: selectedSlots,
        purpose: purpose.trim(),
        participants: parseInt(participants),
        isEvent: false
      });

      console.log('[BookingForm] Booking created successfully:', result);

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error('[BookingForm] Booking error:', err);
      setError(err.message || "Có lỗi xảy ra khi đặt phòng. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const maxCapacity = facilityDetail?.capacity || room?.capacity || 0;

  // Slot definitions (giống backend)
  const SLOT_DEFS = [
    { id: 1, start: "07:00", end: "09:00" },
    { id: 2, start: "09:00", end: "11:00" },
    { id: 3, start: "11:00", end: "13:00" },
    { id: 4, start: "13:00", end: "15:00" },
    { id: 5, start: "15:00", end: "17:00" },
  ];

  // Tính toán time range từ selectedSlots và selectedDate
  const calculateTimeRange = (date, slotIds) => {
    if (!date || !slotIds || slotIds.length === 0) return null;

    const sortedSlots = [...slotIds].map(Number).sort((a, b) => a - b);
    const firstSlot = SLOT_DEFS.find(s => s.id === sortedSlots[0]);
    const lastSlot = SLOT_DEFS.find(s => s.id === sortedSlots[sortedSlots.length - 1]);

    if (!firstSlot || !lastSlot) return null;

    // Build datetime với timezone VN (giống backend)
    // date format: YYYY-MM-DD
    const startTime = buildDateTimeVN(date, parseInt(firstSlot.start.split(':')[0]), parseInt(firstSlot.start.split(':')[1]));
    const endTime = buildDateTimeVN(date, parseInt(lastSlot.end.split(':')[0]), parseInt(lastSlot.end.split(':')[1]));

    return { startTime, endTime };
  };

  // Check conflict với user bookings hiện tại
  const checkUserConflict = (startTime, endTime, bookings) => {
    if (!startTime || !endTime || !bookings || bookings.length === 0) return null;

    return bookings.find(booking => {
      // Chỉ check bookings APPROVED hoặc PENDING
      if (booking.status !== "APPROVED" && booking.status !== "PENDING") return false;

      const bookingStart = new Date(booking.startTime || booking.date || booking.bookingDate);
      const bookingEnd = new Date(booking.endTime || booking.date || booking.bookingDate);

      // Check overlap: startTime < bookingEnd && endTime > bookingStart
      return startTime < bookingEnd && endTime > bookingStart;
    });
  };

  // Load user bookings và check conflict khi selectedSlots hoặc selectedDate thay đổi
  useEffect(() => {
    if (!user || !selectedDate || !selectedSlots || selectedSlots.length === 0) {
      setUserBookings([]);
      setConflictWarning("");
      return;
    }

    const loadAndCheck = async () => {
      setCheckingConflict(true);
      setConflictWarning("");
      
      try {
        const bookings = await getMyBookings();
        const list = Array.isArray(bookings) ? bookings : bookings?.items ?? bookings?.data ?? [];
        setUserBookings(list);

        // Tính time range từ selectedSlots
        const timeRange = calculateTimeRange(selectedDate, selectedSlots);
        if (!timeRange) {
          setCheckingConflict(false);
          return;
        }

        // Check conflict
        const conflict = checkUserConflict(timeRange.startTime, timeRange.endTime, list);
        if (conflict) {
          const conflictRoom = conflict.facility?.name || conflict.facilityName || "phòng khác";
          const conflictTime = conflict.startTime 
            ? new Date(conflict.startTime).toLocaleString("vi-VN", { 
                year: "numeric", 
                month: "2-digit", 
                day: "2-digit", 
                hour: "2-digit", 
                minute: "2-digit" 
              })
            : "—";
          
          setConflictWarning(
            `⚠️ Bạn đã có lịch tại ${conflictRoom} (${conflict.status}) vào ${conflictTime}. Bạn không thể đặt phòng trong khung giờ này.`
          );
        }
      } catch (err) {
        console.warn('[BookingForm] Error loading user bookings for conflict check:', err);
        // Không block user nếu không load được bookings
      } finally {
        setCheckingConflict(false);
      }
    };

    loadAndCheck();
  }, [user, selectedDate, selectedSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-fade-in">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-orange-500" />
        Đặt phòng
      </h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Thông tin đặt phòng */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Phòng:</span>
            <span className="font-semibold text-gray-900">{room?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ngày:</span>
            <span className="font-semibold text-gray-900">
              {selectedDate || toDateISO_Local(new Date())}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Slot đã chọn:</span>
            <span className="font-semibold text-gray-900">
              {selectedSlots.map(id => `Slot ${id}`).join(", ")}
            </span>
          </div>
        </div>

        {/* Mục đích sử dụng */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Mục đích sử dụng <span className="text-red-500">*</span>
          </label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
            placeholder="VD: Học nhóm môn SWP391, Thi đấu giao hữu..."
            required
          />
        </div>

        {/* Số lượng người tham gia */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            Số lượng người tham gia <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max={maxCapacity}
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            placeholder={`Tối đa ${maxCapacity} người`}
            required
          />
          {maxCapacity > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Sức chứa tối đa: {maxCapacity} người
            </p>
          )}
        </div>

        {/* Conflict warning */}
        {conflictWarning && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{conflictWarning}</p>
          </div>
        )}

        {/* Checking conflict indicator */}
        {checkingConflict && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm">Đang kiểm tra lịch trình của bạn...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <CalendarCheck className="w-4 h-4 mr-2" />
                Xác nhận đặt phòng
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

