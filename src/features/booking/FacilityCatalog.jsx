/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";

import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

import { MapPin, Users, Search, Wifi, Projector, Wind, X, Info, Home } from "lucide-react";

import { getFacilities, getFacilityTypes } from "../../services/resourceService";
import { getRoomTypeColor } from "../../lib/roomTypeColors";

export default function FacilityCatalog() {
  const { user } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [typeId, setTypeId] = useState("");
  const [types, setTypes] = useState([]);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [error, setError] = useState("");

  const campusLabel = user?.campusName || `Campus #${user?.campusId ?? ""}`;

  const fetchTypes = async () => {
    try {
      const data = await getFacilityTypes();
      setTypes(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (_) { /* empty */ }
  };

  const fetchFacilities = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFacilities({ typeId: typeId ? Number(typeId) : undefined });

      setRooms(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (e) {
      setRooms([]);
      setError(e?.response?.data?.message || "Không thể tải danh sách phòng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchTypes();
    fetchFacilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchFacilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);

  const filteredRooms = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return rooms;
    return rooms.filter((r) => (r?.name || "").toLowerCase().includes(k));
  }, [rooms, keyword]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-gray-900">Danh sách phòng — {campusLabel}</h1>
          </div>
          <p className="text-gray-500 mt-1">Xem tất cả phòng/tiện ích thuộc campus của bạn.</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            placeholder="Tìm tên phòng..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* Filter type */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600 font-medium">Loại phòng</label>
            <select
              className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              <option value="">Tất cả</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex gap-3">
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white border-none"
              onClick={fetchFacilities}
              disabled={loading}
            >
              {loading ? "Đang tải..." : "Tải lại"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setKeyword("");
                setTypeId("");
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Đang tải danh sách phòng...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <Card
                key={room.id}
                className="group hover:-translate-y-1 transition-all duration-300 p-0 overflow-hidden cursor-pointer border-gray-200 hover:border-orange-200 hover:shadow-lg"
                onClick={() => setSelectedRoom(room)}
              >
                <div className="h-56 overflow-hidden relative">
                  <img
                    src={room.image || room.thumbnailUrl || room?.imageUrls?.[0] || "https://via.placeholder.com/800x500?text=Facility"}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />

                  <div className="absolute top-3 right-3">
                    {(() => {
                      const typeName = room.typeName || room.type?.name || room.type || "PHÒNG";
                      const typeColor = getRoomTypeColor(typeName);
                      return (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeColor.labelBg} ${typeColor.labelText} shadow-sm backdrop-blur-md`}>{typeName}</span>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                    {room.name}
                  </h3>

                  <div className="flex items-center text-sm text-gray-500 gap-4 mb-4">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" /> {campusLabel}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-gray-400" /> {room.capacity ?? "—"} chỗ
                    </span>
                  </div>

                  <Button className="w-full bg-gray-50 text-gray-700 hover:bg-orange-600 hover:text-white border-none shadow-none group-hover:shadow-md transition-all">
                    Xem chi tiết
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">Không có phòng nào trong campus của bạn.</p>
            </div>
          )}
        </div>
      )}

      {selectedRoom && <FacilityDetailModal room={selectedRoom} campusLabel={campusLabel} onClose={() => setSelectedRoom(null)} />}
    </div>
  );
}

function FacilityDetailModal({ room, campusLabel, onClose }) {
  const amenities = [
    { icon: Wifi, label: "Wifi tốc độ cao" },
    { icon: Projector, label: "Máy chiếu HDMI" },
    { icon: Wind, label: "Điều hòa" },
    { icon: Info, label: "Bảng trắng" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>

      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-52 relative shrink-0">
          <img
            src={room.image || room.thumbnailUrl || room?.imageUrls?.[0] || "https://via.placeholder.com/800x500?text=Facility"}
            alt={room.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-all border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-6 text-white">
            <h2 className="text-3xl font-bold text-shadow-sm">{room.name}</h2>
            <p className="flex items-center gap-2 text-gray-200 text-sm mt-1">
              <MapPin className="w-4 h-4 text-orange-400" /> {campusLabel}
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-600 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Sức chứa</p>
                <p className="font-bold text-gray-900 text-lg">{room.capacity ?? "—"} Người</p>
              </div>
            </div>

            {(() => {
              const typeName = room.typeName || room.type?.name || room.type || "—";
              const typeColor = getRoomTypeColor(typeName);
              return (
                <div className={`p-4 rounded-xl ${typeColor.bg} border ${typeColor.border} flex items-center gap-4`}>
                  <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center ${typeColor.text} shadow-sm`}>
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Loại phòng</p>
                    <p className="font-bold text-gray-900 text-lg">{typeName}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {room.description ? (
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
                Mô tả
              </h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-700 leading-relaxed">
                {room.description}
              </div>
            </div>
          ) : null}

          <div className="mb-8">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
              Tiện ích (demo UI)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {amenities.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
                >
                  <item.icon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose} className="hover:bg-gray-200 text-gray-600">
            Đóng lại
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
