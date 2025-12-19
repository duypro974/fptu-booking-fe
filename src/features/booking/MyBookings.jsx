/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { X, Clock, Info } from "lucide-react";
import { createPortal } from "react-dom";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { getMyBookings, cancelBooking, getBookingDetail } from "../../services/bookingService";

const normalizeStatus = (s) => String(s || "").toUpperCase();

const statusToVi = (status) => {
  const st = normalizeStatus(status);
  if (st === "APPROVED") return "Đã duyệt";
  if (st === "PENDING") return "Chờ duyệt";
  if (st === "REJECTED") return "Bị từ chối";
  if (st === "CANCELLED" || st === "CANCELED") return "Đã hủy";
  if (st === "PREEMPTED") return "Bị chiếm chỗ";
  if (st === "COMPLETED") return "Hoàn tất";
  return st || "—";
};

const statusMeta = (status) => {
  const st = normalizeStatus(status);

  if (st === "APPROVED") return { type: "success", label: "Thành công" };
  if (st === "REJECTED") return { type: "danger", label: "Bị từ chối" };
  if (st === "CANCELLED" || st === "CANCELED") return { type: "secondary", label: "Đã hủy" };
  if (st === "PREEMPTED") return { type: "secondary", label: "Bị chiếm chỗ" };
  if (st === "COMPLETED") return { type: "success", label: "Hoàn tất" };
  return { type: "warning", label: "Chờ duyệt" };
};

/* =========================================================
   ✅ FIX: TÓM TẮT TRẠNG THÁI CHO BOOKING ĐỊNH KÌ (isGroup)
   - Vì item.status của group là PROCESSED_GROUP (không map)
   - Status thật nằm trong item.bookings[].status
========================================================= */
const summarizeGroupStatus = (item) => {
  // booking thường: dùng như cũ
  if (!item?.isGroup || !Array.isArray(item?.bookings) || item.bookings.length === 0) {
    const st = normalizeStatus(item?.status);
    const meta = statusMeta(st);
    // Giữ label kiểu tiếng Việt chuẩn, không dùng "Thành công"
    return { st, type: meta.type, label: statusToVi(st) };
  }

  const sts = item.bookings.map((b) => normalizeStatus(b?.status));
  const total = sts.length;

  const count = (x) => sts.filter((s) => s === x).length;
  const approved = count("APPROVED");
  const pending = count("PENDING");
  const rejected = count("REJECTED");
  const cancelled = count("CANCELLED") + count("CANCELED");
  const preempted = count("PREEMPTED");
  const completed = count("COMPLETED");

  const bad = rejected + cancelled + preempted;

  // Tất cả approved
  if (approved === total) {
    return { st: "APPROVED", type: "success", label: `Đã duyệt (${total}/${total})` };
  }

  // Tất cả completed
  if (completed === total) {
    return { st: "COMPLETED", type: "success", label: "Hoàn tất" };
  }

  // Có vấn đề
  if (bad > 0) {
    return { st: "ISSUE", type: "danger", label: `Có vấn đề (${bad}/${total})` };
  }

  // Còn pending
  if (pending > 0) {
    return { st: "PENDING", type: "warning", label: `Chờ duyệt (${pending}/${total})` };
  }

  // Fallback
  return { st: "PENDING", type: "warning", label: `Đang xử lý (${approved}/${total})` };
};

// ===== SLOT DEFINITIONS (CỨNG) =====
const SLOT_DEFS = [
  { id: 1, start: "07:00", end: "09:00" },
  { id: 2, start: "09:00", end: "11:00" },
  { id: 3, start: "11:00", end: "13:00" },
  { id: 4, start: "13:00", end: "15:00" },
  { id: 5, start: "15:00", end: "17:00" },
];

const toDateSafe = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatDate = (value) => {
  const d = toDateSafe(value);
  if (!d) return "—";
  return d.toLocaleDateString("vi-VN");
};

const formatDateTime = (value) => {
  const d = toDateSafe(value);
  if (!d) return "—";
  return d.toLocaleString("vi-VN");
};

const formatHHmm = (value) => {
  const d = toDateSafe(value);
  if (!d) return null;
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const getSlotLabelFromTimes = (startTime, endTime) => {
  const s = formatHHmm(startTime);
  const e = formatHHmm(endTime);
  if (!s || !e) return "—";

  const match = SLOT_DEFS.find((x) => x.start === s && x.end === e);
  if (!match) return `${s} - ${e}`;
  return `Slot ${match.id} (${match.start} - ${match.end})`;
};

const pickFacilityName = (item) =>
  item?.facilityName ||
  item?.facility?.name ||
  item?.roomName ||
  item?.facility?.facilityName ||
  item?.facilityId ||
  "—";

const pickSlots = (item) => {
  if (item?.isGroup && Array.isArray(item?.bookings) && item.bookings.length > 0) {
    const b0 = item.bookings[0];
    return getSlotLabelFromTimes(b0?.startTime, b0?.endTime);
  }

  if (item?.startTime && item?.endTime) {
    return getSlotLabelFromTimes(item.startTime, item.endTime);
  }

  const s = item?.slots ?? item?.slot;
  if (Array.isArray(s)) return s.join(", ");
  if (typeof s === "number") return `Slot ${s}`;
  if (typeof s === "string") return s;

  if (Array.isArray(item?.bookingSlots)) {
    const slots = item.bookingSlots.map((x) => x?.slot).filter(Boolean);
    if (slots.length) return slots.map((n) => `Slot ${n}`).join(", ");
  }

  return "—";
};

// ✅ Lấy lý do + thời gian bị đổi sang trạng thái "REJECTED / CANCELLED / PREEMPTED"
const extractLogInfo = (data) => {
  const history = Array.isArray(data?.history) ? data.history : [];
  const terminalStatuses = ["REJECTED", "CANCELLED", "CANCELED", "PREEMPTED"];

  const terminalRow =
    history.find((h) => terminalStatuses.includes(normalizeStatus(h?.newStatus))) || null;

  const fallbackReason = history?.[0]?.changeReason || data?.latestReason || "";
  const reason = terminalRow?.changeReason || fallbackReason || "";

  const occurredAt = terminalRow?.updatedAt || data?.updatedAt || data?.createdAt || null;

  const newStatus = terminalRow?.newStatus || data?.status || "";

  return { reason, occurredAt, newStatus };
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  // ✅ MODAL LOG
  const [logOpen, setLogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");
  const [logData, setLogData] = useState(null);

  const fetchMyBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyBookings();
      const list = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setBookings(Array.isArray(list) ? list : []);
    } catch (e) {
      setBookings([]);
      const errorMessage =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Không thể tải lịch sử đặt phòng.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const canCancelBooking = (booking) => {
    const status = normalizeStatus(booking?.status);
    if (status !== "APPROVED" && status !== "PENDING") return false;

    const startTime =
      booking?.startTime ||
      booking?.date ||
      booking?.bookingDate ||
      (booking?.isGroup && booking?.bookings?.[0]?.startTime);

    if (!startTime) return false;

    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = (start - now) / (1000 * 60);
    return diffMinutes >= 30;
  };

  const getTimeUntilBooking = (booking) => {
    const startTime =
      booking?.startTime ||
      booking?.date ||
      booking?.bookingDate ||
      (booking?.isGroup && booking?.bookings?.[0]?.startTime);

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
      alert(
        `Không thể hủy đơn này. ${
          timeUntil ? `Thời gian còn lại: ${timeUntil}` : "Đơn đã bắt đầu hoặc đã qua."
        }`
      );
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn đặt phòng này?")) return;

    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId);
      await fetchMyBookings();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Hủy đơn thất bại.";
      alert(errorMsg);
    } finally {
      setCancellingId(null);
    }
  };

  // ✅ Chỉ mở log khi status là REJECTED/CANCELLED/PREEMPTED (không show cho PENDING/APPROVED)
  const openLogModal = async (booking) => {
    const st = normalizeStatus(booking?.status);
    const allowed = ["REJECTED", "CANCELLED", "CANCELED", "PREEMPTED"];
    if (!allowed.includes(st)) return;

    setLogOpen(true);
    setLogLoading(true);
    setLogError("");
    setLogData(null);

    try {
      const data = await getBookingDetail(booking.id);
      setLogData(data);
    } catch (e) {
      setLogError(e?.response?.data?.message || e?.message || "Không thể tải log booking.");
    } finally {
      setLogLoading(false);
    }
  };

  const closeLogModal = () => {
    setLogOpen(false);
    setLogError("");
    setLogData(null);
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
                  // ✅ FIX: dùng summary cho badge (định kì) + giữ status gốc cho action/log
                  const sum = summarizeGroupStatus(item);

                  const canCancel = canCancelBooking(item);
                  const timeUntil = getTimeUntilBooking(item);

                  // status gốc (để không phá hành vi cũ: log/cancel theo API hiện tại)
                  const status = normalizeStatus(item?.status);
                  const isCancelled = status === "CANCELLED" || status === "CANCELED";

                  const dateValue =
                    item?.startTime ||
                    (item?.isGroup && item?.bookings?.[0]?.startTime) ||
                    item?.date ||
                    item?.bookingDate ||
                    item?.createdAt;

                  // ✅ Nếu là group: hiện tại không mở log theo item.id (vì log đang theo booking đơn)
                  const showLogBtn =
                    !item?.isGroup &&
                    ["REJECTED", "CANCELLED", "CANCELED", "PREEMPTED"].includes(status);

                  return (
                    <tr key={item?.id ?? idx} className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{pickFacilityName(item)}</td>
                      <td className="p-4 text-gray-600">{formatDate(dateValue)}</td>
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

                      {/* ✅ FIX: Badge dùng sum thay vì item.status */}
                      <td className="p-4 text-right">
                        <Badge type={sum.type}>{sum.label}</Badge>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {showLogBtn && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openLogModal(item)}
                              className="whitespace-nowrap"
                              title="Xem lý do"
                            >
                              <Info className="w-4 h-4 mr-1" />
                              Xem lý do
                            </Button>
                          )}

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
                            <span className="text-xs text-gray-400 italic">Không thể hủy</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {logOpen && (
        <BookingLogModal
          loading={logLoading}
          error={logError}
          data={logData}
          onClose={closeLogModal}
        />
      )}
    </div>
  );
}

// ✅ Modal log màu ĐỎ + trạng thái tiếng Việt + chỉ show lý do + thời gian
function BookingLogModal({ loading, error, data, onClose }) {
  const { reason, occurredAt, newStatus } = extractLogInfo(data);
  const st = normalizeStatus(newStatus || data?.status);

  // Chỉ hiển thị log cho các trạng thái "kết thúc"
  const allowed = ["REJECTED", "CANCELLED", "CANCELED", "PREEMPTED"];
  const canShow = allowed.includes(st);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60" onClick={onClose} />

      <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="text-lg font-bold text-gray-900">Log booking</div>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500">Đang tải...</div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          ) : !data ? (
            <div className="text-sm text-gray-500">Không có dữ liệu.</div>
          ) : !canShow ? (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700">
              Log chỉ hiển thị khi booking bị <b>từ chối / hủy / chiếm chỗ</b>.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Phòng</div>
                  <div className="font-semibold text-gray-900">
                    {data?.facility?.name ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Thời gian</div>
                  <div className="font-semibold text-gray-900">
                    {getSlotLabelFromTimes(data?.startTime, data?.endTime)}
                  </div>
                </div>
              </div>

              {/* ✅ RED box */}
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
                <div className="font-semibold mb-1">Trạng thái</div>
                <div className="mb-3">{statusToVi(st)}</div>

                <div className="font-semibold mb-1">Lý do</div>
                <div>{reason || "Không có lý do."}</div>

                <div className="mt-3 pt-3 border-t border-red-200/70">
                  <div className="font-semibold mb-1">Thời gian cập nhật</div>
                  <div>{occurredAt ? formatDateTime(occurredAt) : "—"}</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
