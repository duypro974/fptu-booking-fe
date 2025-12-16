/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { X, Clock } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { getMyBookings, cancelBooking } from "../../services/bookingService";

const normalizeStatus = (s) => String(s || "").toUpperCase();

const statusMeta = (status) => {
  const st = normalizeStatus(status);

  if (st === "APPROVED") return { type: "success", label: "Thành công" };
  if (st === "REJECTED") return { type: "danger", label: "Bị từ chối" };
  if (st === "CANCELLED" || st === "CANCELED") return { type: "secondary", label: "Đã hủy" };
  return { type: "warning", label: "Chờ duyệt" }; // PENDING/others
};

const formatDate = (value) => {
  if (!value) return "—";
  // BE có thể trả "2025-10-20" hoặc ISO datetime
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("vi-VN");
  }
  return String(value);
};

const pickFacilityName = (item) =>
  item?.facilityName ||
  item?.facility?.name ||
  item?.roomName ||
  item?.facility?.facilityName ||
  item?.facilityId ||
  "—";

const pickSlots = (item) => {
  const s = item?.slots ?? item?.slot;
  if (Array.isArray(s)) return s.join(", ");
  if (typeof s === "number") return String(s);
  if (typeof s === "string") return s;
  // một số BE trả bookingSlots: [{slot: 1}, ...]
  if (Array.isArray(item?.bookingSlots)) {
    return item.bookingSlots.map((x) => x?.slot).filter(Boolean).join(", ");
  }
  return "—";
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const fetchMyBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyBookings();
      const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
      setBookings(Array.isArray(list) ? list : []);
    } catch (e) {
      setBookings([]);
      const errorMessage = e?.response?.data?.message || 
                          e?.response?.data?.error || 
                          e?.message || 
                          "Không thể tải lịch sử đặt phòng.";
      console.error('[MyBookings.fetchMyBookings] Error details:', {
        message: errorMessage,
        status: e?.response?.status,
        data: e?.response?.data
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  // Kiểm tra xem có thể hủy đơn không (trước 30 phút)
  const canCancelBooking = (booking) => {
    const status = normalizeStatus(booking?.status);
    // Chỉ cho phép hủy đơn APPROVED hoặc PENDING
    if (status !== "APPROVED" && status !== "PENDING") {
      return false;
    }

    // Lấy thời gian bắt đầu từ booking
    const startTime = booking?.startTime || booking?.date || booking?.bookingDate;
    if (!startTime) return false;

    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = (start - now) / (1000 * 60);

    // Chỉ cho phép hủy nếu còn ít nhất 30 phút
    return diffMinutes >= 30;
  };

  const getTimeUntilBooking = (booking) => {
    const startTime = booking?.startTime || booking?.date || booking?.bookingDate;
    if (!startTime) return null;

    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((start - now) / (1000 * 60));

    if (diffMinutes < 0) return "Đã qua";
    if (diffMinutes < 60) return `Còn ${diffMinutes} phút`;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `Còn ${hours}h ${minutes}p`;
  };

  const handleCancelBooking = async (bookingId, booking) => {
    if (!canCancelBooking(booking)) {
      const timeUntil = getTimeUntilBooking(booking);
      alert(`Không thể hủy đơn này. ${timeUntil ? `Thời gian còn lại: ${timeUntil}` : "Đơn đã bắt đầu hoặc đã qua."}`);
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn đặt phòng này?")) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId);
      // Refresh danh sách sau khi hủy thành công
      await fetchMyBookings();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Hủy đơn thất bại.";
      alert(errorMsg);
    } finally {
      setCancellingId(null);
    }
  };

  const rows = useMemo(() => bookings, [bookings]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Lịch sử đặt phòng</h1>

        <Button
          variant="secondary"
          onClick={fetchMyBookings}
          disabled={loading}
          className="whitespace-nowrap"
        >
          {loading ? "Đang tải..." : "Tải lại"}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-medium text-gray-600">Phòng</th>
                <th className="p-4 font-medium text-gray-600">Ngày</th>
                <th className="p-4 font-medium text-gray-600">Slot</th>
                <th className="p-4 font-medium text-gray-600">Thời gian</th>
                <th className="p-4 font-medium text-gray-600 text-right">Trạng thái</th>
                <th className="p-4 font-medium text-gray-600 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Chưa có lịch sử đặt phòng nào.
                  </td>
                </tr>
              ) : (
                rows.map((item, idx) => {
                  const meta = statusMeta(item?.status);
                  const canCancel = canCancelBooking(item);
                  const timeUntil = getTimeUntilBooking(item);
                  const status = normalizeStatus(item?.status);
                  const isCancelled = status === "CANCELLED" || status === "CANCELED";

                  return (
                    <tr key={item?.id ?? idx} className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{pickFacilityName(item)}</td>
                      <td className="p-4 text-gray-600">{formatDate(item?.date || item?.bookingDate || item?.createdAt)}</td>
                      <td className="p-4 text-gray-600">{pickSlots(item)}</td>
                      <td className="p-4 text-gray-600 text-sm">
                        {timeUntil ? (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{timeUntil}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Badge type={meta.type}>{meta.label}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        {!isCancelled && canCancel && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleCancelBooking(item.id, item)}
                            disabled={cancellingId === item.id}
                            className="whitespace-nowrap"
                          >
                            {cancellingId === item.id ? (
                              "Đang hủy..."
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Hủy đơn
                              </>
                            )}
                          </Button>
                        )}
                        {!isCancelled && !canCancel && status === "APPROVED" && (
                          <span className="text-xs text-gray-400 italic">
                            Không thể hủy
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
