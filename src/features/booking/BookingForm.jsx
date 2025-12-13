import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import Button from "../../components/ui/Button";
import { Calendar, Users, FileText, AlertCircle, Loader2, CalendarCheck } from "lucide-react";

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

    try {
      console.log('[BookingForm] Submitting booking:', {
        facilityId: room.id,
        date: selectedDate || new Date().toISOString().split('T')[0],
        slotIds: selectedSlots,
        purpose: purpose.trim(),
        participants: parseInt(participants),
        isEvent: false // Student booking, not event
      });

      const result = await api.createBooking({
        facilityId: room.id,
        date: selectedDate || new Date().toISOString().split('T')[0],
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
              {selectedDate || new Date().toLocaleDateString('vi-VN')}
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

