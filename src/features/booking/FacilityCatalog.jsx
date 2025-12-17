/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";

import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

import {
  MapPin,
  Users,
  Search,
  X,
  Info,
  Home,
} from "lucide-react";

import { getFacilities, getFacilityTypes } from "../../services/resourceService";
import { getEquipmentsByFacility } from "../../services/equipmentService";
import { getRoomTypeColor } from "../../lib/roomTypeColors";

/* =========================
 * MAIN PAGE
 * ========================= */
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
      setTypes(Array.isArray(data) ? data : data?.items ?? []);
    } catch {
      setTypes([]);
    }
  };

  const fetchFacilities = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFacilities({
        typeId: typeId ? Number(typeId) : undefined,
      });
      setRooms(Array.isArray(data) ? data : data?.items ?? []);
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
            <h1 className="text-2xl font-bold text-gray-900">
              Danh sách phòng — {campusLabel}
            </h1>
          </div>
          <p className="text-gray-500 mt-1">
            Xem phòng và thiết bị theo từng phòng.
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Tìm tên phòng..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600 font-medium">Loại phòng</label>
            <select
              className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
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
            <Button onClick={fetchFacilities} disabled={loading}>
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
                className="cursor-pointer hover:-translate-y-1 transition-all"
                onClick={() => setSelectedRoom(room)}
              >
                <img
                  src={
                    room.image ||
                    room.thumbnailUrl ||
                    room?.imageUrls?.[0] ||
                    "https://via.placeholder.com/800x500"
                  }
                  alt={room.name}
                  className="h-48 w-full object-cover rounded-xl mb-4"
                />

                <h3 className="font-bold text-lg">{room.name}</h3>

                <div className="text-sm text-gray-500 mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" /> {room.capacity ?? "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {campusLabel}
                  </span>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 text-gray-500">
              Không có phòng nào phù hợp.
            </div>
          )}
        </div>
      )}

      {selectedRoom && (
        <FacilityDetailModal
          room={selectedRoom}
          campusLabel={campusLabel}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
}

/* =========================
 * DETAIL MODAL (REAL EQUIPMENT)
 * ========================= */
function FacilityDetailModal({ room, campusLabel, onClose }) {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchEquipments = async () => {
      if (!room?.id) return;
      setLoading(true);
      try {
        const res = await getEquipmentsByFacility(room.id);
        if (mounted) setEquipments(Array.isArray(res?.equipment) ? res.equipment : []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEquipments();
    return () => (mounted = false);
  }, [room?.id]);

  const conditionVi = (c) => (c === "poor" ? "Kém" : "Tốt");
  const statusVi = (c) => (c === "poor" ? "Sửa chữa" : "Sẵn sàng");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>

      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-xl relative z-10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">{room.name}</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <InfoBlock icon={Users} label="Sức chứa" value={`${room.capacity ?? "—"} người`} />
            <InfoBlock icon={MapPin} label="Campus" value={campusLabel} />
          </div>

          <div>
            <h3 className="font-bold mb-3">Thiết bị trong phòng</h3>

            {loading ? (
              <p className="text-gray-500">Đang tải thiết bị...</p>
            ) : equipments.length > 0 ? (
              <div className="space-y-2">
                {equipments.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {it?.equipmentType?.name || "Thiết bị"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Số lượng: {it.quantity}
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        it.condition === "poor"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {statusVi(it.condition)} ({conditionVi(it.condition)})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Phòng chưa có thiết bị.</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================
 * SMALL COMPONENT
 * ========================= */
function InfoBlock({ icon: Icon, label, value }) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 border flex items-center gap-3">
      <Icon className="w-5 h-5 text-orange-600" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
