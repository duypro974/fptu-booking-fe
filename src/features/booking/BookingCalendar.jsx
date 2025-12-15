/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMyBookings } from "../../services/bookingService";
import { getRoomTypeColor } from "../../lib/roomTypeColors";

export default function BookingCalendar({ date }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getMyBookings();
        setBookings(Array.isArray(data) ? data : (data?.items ?? []));
      } catch (e) {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div className="py-8 text-center text-gray-400">Đang tải lịch...</div>;

  // Very lightweight calendar: grouped list by date (date prop optional)
  const list = bookings
    .filter((b) => (date ? (b.date || b.startDate || "") === date : true))
    .sort((a, b) => String(a.date || a.startDate).localeCompare(String(b.date || b.startDate)));

  if (!list.length) return <div className="py-8 text-center text-gray-500">Không có booking nào.</div>;

  return (
    <div className="space-y-3">
      {list.map((b) => {
        const room = b.facility || b.room || b.facilityDetail || {};
        const typeName = room.typeName || room.type?.name || room.type || "—";
        const typeColor = getRoomTypeColor(typeName);
        return (
          <div key={b.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${typeColor.accent}`} />
              <div>
                <div className="font-semibold text-gray-900">{room.name || b.title || "Phòng"}</div>
                <div className="text-sm text-gray-500">{typeName} • {b.date || b.startDate} • Slot(s): {b.slots || b.slot || "—"}</div>
              </div>
            </div>
            <div className="text-sm font-medium">
              <span className={`${typeColor.labelBg} ${typeColor.labelText} px-3 py-1 rounded-full`}>Trạng thái: {String(b.status || "").toUpperCase() || "—"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
