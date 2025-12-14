/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { getMyBookings } from "../../services/bookingService";

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

  const fetchMyBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyBookings();
      const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
      setBookings(Array.isArray(list) ? list : []);
    } catch (e) {
      setBookings([]);
      setError(e?.response?.data?.message || e?.message || "Không thể tải lịch sử đặt phòng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

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
                <th className="p-4 font-medium text-gray-600 text-right">Trạng thái</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Chưa có lịch sử đặt phòng nào.
                  </td>
                </tr>
              ) : (
                rows.map((item, idx) => {
                  const meta = statusMeta(item?.status);
                  return (
                    <tr key={item?.id ?? idx} className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{pickFacilityName(item)}</td>
                      <td className="p-4 text-gray-600">{formatDate(item?.date || item?.bookingDate || item?.createdAt)}</td>
                      <td className="p-4 text-gray-600">{pickSlots(item)}</td>
                      <td className="p-4 text-right">
                        <Badge type={meta.type}>{meta.label}</Badge>
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
