/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import SuccessDialog from "../../components/ui/SuccessDialog";
import { MapPin, Users, Search, CalendarDays, X, Clock, CalendarCheck } from "lucide-react";
import { getFacilities, getFacilityTypes } from "../../services/resourceService";
import { getRoomTypeColor } from "../../lib/roomTypeColors";
import BookingForm from "./BookingForm";

function toLocalYMD(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseTimeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

const DEFAULT_SLOTS = [
  { id: 1, start: "07:00", end: "08:30", label: "Slot 1" },
  { id: 2, start: "08:30", end: "10:00", label: "Slot 2" },
  { id: 3, start: "10:00", end: "11:30", label: "Slot 3" },
  { id: 4, start: "11:30", end: "13:00", label: "Slot 4" },
  { id: 5, start: "13:00", end: "14:30", label: "Slot 5" },
  { id: 6, start: "14:30", end: "16:00", label: "Slot 6" },
  { id: 7, start: "16:00", end: "17:30", label: "Slot 7" },
  { id: 8, start: "17:30", end: "19:00", label: "Slot 8" },
  { id: 9, start: "19:00", end: "20:30", label: "Slot 9" },
  { id: 10, start: "20:30", end: "22:00", label: "Slot 10" },
];

export default function FacilitySearchByDate() {
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => toLocalYMD(new Date()));
  const [keyword, setKeyword] = useState("");
  const [typeId, setTypeId] = useState("");
  const [types, setTypes] = useState([]);

  const [slotId, setSlotId] = useState(""); // "" | "1".."10"

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [didSearch, setDidSearch] = useState(false);
  const [error, setError] = useState("");

  const [selectedRoom, setSelectedRoom] = useState(null);

  const campusLabel = user?.campusName || `Campus #${user?.campusId ?? ""}`;
  const todayYMD = toLocalYMD(new Date());
  const isToday = selectedDate === todayYMD;

  const slotExpired = (slot) => {
    if (!isToday) return false;
    return parseTimeToMinutes(slot.end) <= nowMinutes();
  };

  const selectedSlotObj = useMemo(() => {
    if (!slotId) return null;
    return DEFAULT_SLOTS.find((s) => String(s.id) === String(slotId)) || null;
  }, [slotId]);

  // realtime validate when date changes
  useEffect(() => {
    if (!selectedDate) return;

    if (selectedDate < todayYMD) {
      setError("Không được chọn ngày trong quá khứ.");
      setDidSearch(false);
      setRooms([]);
      setSelectedRoom(null);
      return;
    }

    if (selectedSlotObj && slotExpired(selectedSlotObj)) {
      setError(`Slot ${selectedSlotObj.id} đã qua giờ. Vui lòng chọn slot khác hoặc chọn ngày khác.`);
      setDidSearch(false);
      setRooms([]);
      setSelectedRoom(null);
      return;
    }

    setError("");
  }, [selectedDate, todayYMD, selectedSlotObj]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await getFacilityTypes();
        setTypes(Array.isArray(data) ? data : data?.items ?? []);
      } catch (_) {
        setTypes([]);
      }
    })();
  }, [user]);

  const handleSearch = async () => {
    if (!selectedDate) {
      setError("Vui lòng chọn ngày.");
      return;
    }
    if (selectedDate < todayYMD) {
      setError("Không được chọn ngày trong quá khứ.");
      return;
    }
    if (selectedSlotObj && slotExpired(selectedSlotObj)) {
      setError(`Slot ${selectedSlotObj.id} đã qua giờ. Vui lòng chọn slot khác hoặc chọn ngày khác.`);
      return;
    }

    setLoading(true);
    setError("");
    setDidSearch(true);

    try {
      const data = await getFacilities({
        typeId: typeId ? Number(typeId) : undefined,
        // date: selectedDate, // mở lại nếu backend hỗ trợ lọc theo ngày
      });
      const list = Array.isArray(data) ? data : data?.items ?? [];
      setRooms(list);
    } catch (e) {
      setRooms([]);
      setError(e?.response?.data?.message || "Không thể tải danh sách phòng theo ngày.");
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    let list = rooms;

    if (k) list = list.filter((r) => (r?.name || "").toLowerCase().includes(k));

    if (selectedSlotObj) {
      if (slotExpired(selectedSlotObj)) return [];
      return list;
    }

    return list;
  }, [rooms, keyword, selectedSlotObj, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-6 h-6 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-900">Tìm & đặt phòng theo ngày — {campusLabel}</h1>
        </div>
        <p className="text-gray-500">Chọn ngày + slot (tuỳ chọn). Ngày quá khứ hoặc slot đã qua giờ sẽ bị chặn.</p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chọn ngày</label>
            <input
              type="date"
              value={selectedDate}
              min={todayYMD}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loại phòng</label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">Tất cả</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slot</label>
            <select
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">Tất cả</option>
              {DEFAULT_SLOTS.map((s) => (
                <option key={s.id} value={s.id} disabled={isToday && slotExpired(s)}>
                  {s.label} ({s.start}-{s.end}) {isToday && slotExpired(s) ? " - đã qua giờ" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tìm theo tên</label>
            <Search className="absolute left-3 top-[38px] text-gray-400 w-5 h-5" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="VD: Seminar, Sân bóng..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white border-none w-full"
              onClick={handleSearch}
              disabled={loading || !!error}
              title={error ? error : ""}
            >
              {loading ? "Đang tìm..." : "Tìm"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {!didSearch ? (
        <div className="text-center py-14 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500">Chọn ngày + slot (nếu cần) rồi bấm “Tìm”.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Đang tải danh sách phòng cho ngày {selectedDate}...</p>
        </div>
      ) : (
        <div>
          <div className="mb-3 text-sm text-gray-600">
            Kết quả ngày <span className="font-semibold text-gray-900">{selectedDate}</span>
            {slotId ? <> • <span className="font-semibold text-gray-900">Slot {slotId}</span></> : null}
            : <span className="font-semibold text-gray-900">{filteredRooms.length}</span> phòng
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <Card
                  key={room.id}
                  className="p-0 overflow-hidden border-gray-200 hover:border-orange-200 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src={room.image || room.thumbnailUrl || room?.imageUrls?.[0] || "https://via.placeholder.com/800x500?text=Facility"}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      {(() => {
                        const typeName = room.typeName || room.type?.name || room.type || "PHÒNG";
                        const typeColor = getRoomTypeColor(typeName);
                        return (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeColor.labelBg} ${typeColor.labelText} shadow-sm backdrop-blur-md`}>
                            {typeName}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{room.name}</h3>
                    <div className="flex items-center text-sm text-gray-500 gap-4">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" /> {campusLabel}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-gray-400" /> {room.capacity ?? "—"} chỗ
                      </span>
                    </div>

                    <div className="mt-4">
                      <Button className="w-full bg-gray-50 text-gray-700 hover:bg-orange-600 hover:text-white border-none shadow-none">
                        Xem chi tiết & đặt
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Không có phòng phù hợp.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedRoom && (
        <RoomBookingModal
          room={selectedRoom}
          campusLabel={campusLabel}
          selectedDate={selectedDate}
          preselectedSlotId={slotId ? Number(slotId) : null}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
}

function RoomBookingModal({ room, campusLabel, selectedDate, preselectedSlotId, onClose }) {
  const todayYMD = toLocalYMD(new Date());
  const isToday = selectedDate === todayYMD;

  const [selectedSlots, setSelectedSlots] = useState(() => (preselectedSlotId ? [preselectedSlotId] : []));
  const [showBookingForm, setShowBookingForm] = useState(false);

  // ✅ NEW: success dialog state
  const [successDialog, setSuccessDialog] = useState(null);

  const slotExpired = (slot) => {
    if (!isToday) return false;
    return parseTimeToMinutes(slot.end) <= nowMinutes();
  };

  const handleSlotClick = (slotId) => {
    if (selectedSlots.includes(slotId)) {
      setSelectedSlots(selectedSlots.filter((id) => id !== slotId));
      return;
    }

    if (selectedSlots.length === 0) {
      setSelectedSlots([slotId]);
      return;
    }

    const sorted = [...selectedSlots, slotId].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        alert("Các slot phải liên tiếp nhau! Vui lòng chọn lại.");
        return;
      }
    }
    setSelectedSlots(sorted);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={onClose}></div>

      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">{room.name}</div>
            <div className="text-sm text-gray-500">
              {campusLabel} • Ngày: <span className="font-semibold text-gray-900">{selectedDate}</span>
            </div>
          </div>

          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Chọn slot (slot đã qua giờ sẽ bị khóa)
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {DEFAULT_SLOTS.map((slot) => {
                const expired = slotExpired(slot);
                const isSelected = selectedSlots.includes(slot.id);

                return (
                  <button
                    key={slot.id}
                    onClick={() => !expired && handleSlotClick(slot.id)}
                    disabled={expired}
                    className={`
                      p-4 rounded-lg border-2 text-center transition-all
                      ${expired
                        ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-60"
                        : isSelected
                        ? "bg-orange-500 border-orange-600 text-white"
                        : "bg-gray-50 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                      }
                    `}
                    title={expired ? "Slot đã qua giờ" : ""}
                  >
                    <div className="text-xs font-semibold mb-1">{slot.label}</div>
                    <div className="text-xs">{slot.start} - {slot.end}</div>
                    {expired && <div className="text-[11px] mt-1 text-gray-600">Đã qua giờ</div>}
                  </button>
                );
              })}
            </div>

            {selectedSlots.length > 0 && !showBookingForm && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm font-semibold text-orange-900 mb-2">
                  Đã chọn {selectedSlots.length} slot: {selectedSlots.map((id) => `Slot ${id}`).join(", ")}
                </p>
                <Button onClick={() => setShowBookingForm(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Tiếp tục đặt phòng
                </Button>
              </div>
            )}
          </div>

          {showBookingForm && (
            <div className="border-t border-gray-200 pt-6">
              <BookingForm
                room={room}
                selectedSlots={selectedSlots}
                selectedDate={selectedDate}
                onSuccess={(result) => {
                  setSuccessDialog({
                    title: "Đặt phòng thành công!",
                    message: result?.message || "Yêu cầu đặt phòng đã được gửi thành công.",
                    bookingCode: result?.bookingCode,
                  });

                  // reset UI, nhưng KHÔNG đóng modal ngay để user thấy dialog
                  setShowBookingForm(false);
                  setSelectedSlots([]);
                }}
                onCancel={() => setShowBookingForm(false)}
              />
            </div>
          )}
        </div>

        {!showBookingForm && (
          <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} className="hover:bg-gray-200 text-gray-600">
              Đóng lại
            </Button>
          </div>
        )}
      </div>

      {/* ✅ Success Dialog */}
      {successDialog && (
        <SuccessDialog
          title={successDialog.title}
          message={successDialog.message}
          bookingCode={successDialog.bookingCode}
          onClose={() => {
            setSuccessDialog(null);
            onClose(); // đóng modal sau khi user đóng dialog
          }}
        />
      )}
    </div>,
    document.body
  );
}
