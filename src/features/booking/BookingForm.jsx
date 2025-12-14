import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  CalendarCheck,
  Users,
  ClipboardList,
  Clock,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

import { createBooking } from "../../services/bookingService";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function BookingForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // lấy từ query: /booking/create?facilityId=1&date=2025-10-20&slots=1,2
  const facilityId = params.get("facilityId") || "";
  const dateFromQuery = params.get("date") || "";
  const slotsFromQuery = params.get("slots") || "";

  const initialSlots = useMemo(() => {
    if (!slotsFromQuery) return [];
    return slotsFromQuery
      .split(",")
      .map((x) => Number(String(x).trim()))
      .filter((n) => !Number.isNaN(n));
  }, [slotsFromQuery]);

  const [date, setDate] = useState(dateFromQuery || todayISO());
  const [slots, setSlots] = useState(initialSlots);
  const [bookingTypeId, setBookingTypeId] = useState(1); // bạn đổi mapping theo BE nếu khác
  const [attendeeCount, setAttendeeCount] = useState("");
  const [purpose, setPurpose] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal confirm
  const [confirmOpen, setConfirmOpen] = useState(false);

  // validate
  const canSubmit = useMemo(() => {
    if (!facilityId) return false;
    if (!date) return false;
    if (!slots.length) return false;
    if (!bookingTypeId) return false;
    return true;
  }, [facilityId, date, slots, bookingTypeId]);

  useEffect(() => {
    // nếu user vào thẳng /booking/create không có query => báo
    if (!facilityId) setError("Thiếu facilityId. Hãy quay lại trang tìm phòng và chọn phòng.");
  }, [facilityId]);

  const toggleSlot = (n) => {
    setSlots((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  };

  const openConfirm = () => {
    setError("");
    if (!canSubmit) {
      setError("Vui lòng chọn đủ thông tin (facilityId, ngày, slot, booking type).");
      return;
    }
    setConfirmOpen(true);
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        facilityId: Number(facilityId),
        date,
        slots,
        bookingTypeId: Number(bookingTypeId),
        purpose: purpose?.trim() ? purpose.trim() : undefined,
        attendeeCount: attendeeCount ? Number(attendeeCount) : undefined,
      };

      await createBooking(payload);

      setSuccessMsg("Đặt phòng thành công! Đơn của bạn đã được gửi.");
      setConfirmOpen(false);

      // redirect nhẹ nhàng
      setTimeout(() => navigate("/booking/my"), 700);
    } catch (e) {
      setError(e?.response?.data?.message || "Đặt phòng thất bại. Vui lòng thử lại.");
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tạo đơn đặt phòng</h1>
            <p className="text-gray-500 mt-1">
              Điền thông tin và xác nhận để gửi yêu cầu đặt phòng.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="hover:bg-gray-200 text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
        </div>

        {/* Summary line */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge type="info" className="bg-white/90">
            FacilityId: <b className="ml-1">{facilityId || "—"}</b>
          </Badge>
          <Badge type="info" className="bg-white/90">
            Ngày: <b className="ml-1">{date || "—"}</b>
          </Badge>
          <Badge type="info" className="bg-white/90">
            Slots: <b className="ml-1">{slots.length ? slots.join(", ") : "—"}</b>
          </Badge>
        </div>
      </div>

      {/* Form */}
      <Card className="p-0 overflow-hidden border-gray-200 shadow-sm">
        {/* Section title */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-600 shadow-sm">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">Thông tin booking</div>
              <div className="text-sm text-gray-600">Chọn thời gian và mục đích sử dụng</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Date + Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Ngày sử dụng
              </label>
              <input
                type="date"
                className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-400" />
                Booking Type
              </label>
              <select
                className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                value={bookingTypeId}
                onChange={(e) => setBookingTypeId(Number(e.target.value))}
              >
                <option value={1}>Đặt lẻ (Học/Họp)</option>
                <option value={2}>Đặt CLB / Sự kiện</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Nếu BE mapping khác, bạn chỉ cần đổi value ở đây.
              </p>
            </div>
          </div>

          {/* Slots */}
          <div>
            <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-gray-400" />
              Chọn slots
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 10 }).map((_, i) => {
                const n = i + 1;
                const active = slots.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleSlot(n)}
                    className={[
                      "px-3 py-2 rounded-xl border transition-all",
                      active
                        ? "bg-black text-white border-black shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50",
                    ].join(" ")}
                  >
                    Slot {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attendees */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                Số người tham gia
              </label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder="VD: 25"
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <div className="w-full p-4 rounded-xl bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">
                <b>Lưu ý:</b> Thông tin “số người” giúp hệ thống kiểm tra sức chứa phòng.
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              Mục đích sử dụng
            </label>
            <textarea
              className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all min-h-[110px]"
              placeholder="VD: Họp nhóm, ôn tập, sinh hoạt CLB..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700">
              <CheckCircle2 className="w-5 h-5 mt-0.5" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => navigate("/booking/search")}
              className="hover:bg-gray-200 text-gray-700"
            >
              Về tìm phòng
            </Button>

            <Button
              disabled={!canSubmit || submitting}
              onClick={openConfirm}
              className="px-8 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-200 border-none"
            >
              <CalendarCheck className="w-4 h-4 mr-2" />
              {submitting ? "Đang gửi..." : "Xác nhận đặt phòng"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirm Modal */}
      {confirmOpen && (
        <ConfirmModal
          onClose={() => setConfirmOpen(false)}
          onConfirm={onSubmit}
          submitting={submitting}
          summary={{
            facilityId,
            date,
            slots,
            bookingTypeId,
            attendeeCount,
            purpose,
          }}
        />
      )}
    </div>
  );
}

/** Modal confirm giống style RoomSearch */
function ConfirmModal({ onClose, onConfirm, submitting, summary }) {
  const bookingTypeLabel =
    Number(summary.bookingTypeId) === 2 ? "Đặt CLB / Sự kiện" : "Đặt lẻ (Học/Họp)";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      <div
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50 flex items-center justify-between">
          <div className="font-bold text-gray-900 text-lg">Xác nhận đặt phòng</div>
          <button
            onClick={onClose}
            className="bg-black/5 hover:bg-black/10 text-gray-800 p-2 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">FacilityId</div>
              <div className="font-bold text-gray-900 text-lg">{summary.facilityId}</div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Ngày</div>
              <div className="font-bold text-gray-900 text-lg">{summary.date}</div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Slots</div>
              <div className="font-bold text-gray-900 text-lg">
                {summary.slots?.length ? summary.slots.join(", ") : "—"}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Loại booking</div>
              <div className="font-bold text-gray-900 text-base">{bookingTypeLabel}</div>
            </div>
          </div>

          {summary.attendeeCount ? (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-sm text-gray-800">
              <b>Số người:</b> {summary.attendeeCount}
            </div>
          ) : null}

          {summary.purpose?.trim() ? (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-gray-800">
              <b>Mục đích:</b> {summary.purpose}
            </div>
          ) : null}

          <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">
            Vui lòng kiểm tra thông tin trước khi gửi. Sau khi gửi, đơn sẽ chờ admin duyệt.
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} className="hover:bg-gray-200 text-gray-600">
            Chỉnh sửa
          </Button>
          <Button
            onClick={onConfirm}
            disabled={submitting}
            className="px-8 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-200 border-none"
          >
            <CalendarCheck className="w-4 h-4 mr-2" />
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
