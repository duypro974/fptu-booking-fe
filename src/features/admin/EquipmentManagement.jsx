/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Search, Package, Building2, Eye, History } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import AdminLayout, { AdminHeader, AdminContent } from "../../components/layout/AdminLayout";

import {
  getEquipmentTypes,
  createEquipmentType,
  getEquipmentsByFacility,
  addEquipmentToFacility,
  updateFacilityEquipment,
  removeFacilityEquipment,
  getFacilityEquipmentHistory,
} from "../../services/equipmentService";

/** =========================
 *  CONDITION + STATUS
 *  UI: GOOD | POOR
 *  API: good | poor
 *  ========================= */
const toApiCondition = (uiCondition) => {
  const c = (uiCondition || "GOOD").toString().toUpperCase();
  return c === "POOR" ? "poor" : "good";
};

const toUiCondition = (apiCondition) => {
  const c = (apiCondition || "good").toString().toLowerCase();
  return c === "poor" ? "POOR" : "GOOD";
};

const displayConditionVi = (uiCondition) => (uiCondition === "POOR" ? "Kém" : "Tốt");

const displayCategoryVi = (value) => {
  const v = (value || "").toString().toLowerCase();
  if (v === "visual") return "Hình ảnh";
  if (v === "audio") return "Âm thanh";
  if (v === "network") return "Mạng";
  if (v === "general") return "Chung";
  return value || "-";
};

const statusFromCondition = (uiCondition) => (uiCondition === "POOR" ? "repair" : "available");
const displayStatusVi = (status) => (status === "repair" ? "Sửa chữa" : "Sẵn sàng");
const badgeTypeFromStatus = (status) => (status === "repair" ? "warning" : "success");

const isFiniteNumber = (v) => Number.isFinite(Number(v));
const toNumberOrNull = (v) => (isFiniteNumber(v) ? Number(v) : null);

export default function EquipmentManagement() {
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState("types"); // types | instances
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [rows, setRows] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  const [showUpsertModal, setShowUpsertModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [detailTab, setDetailTab] = useState("info"); // info | history
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    equipmentTypeId: "",
    roomId: "",
    quantity: "",
    condition: "GOOD",
    description: "",
  });

  const [editNote, setEditNote] = useState("");
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [typeFormData, setTypeFormData] = useState({
    name: "",
    iconUrl: "",
    category: "General",
  });

  const [selectedRoomName, setSelectedRoomName] = useState("");
  const [itemHistory, setItemHistory] = useState([]);

  const resolveCampusId = useCallback(() => {
    let campusId = null;

    if (user?.campusId) campusId = user.campusId;
    else if (typeof user?.campus === "number") campusId = user.campus;
    else if (typeof user?.campus === "string") {
      const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
      campusId = campusMap[user.campus.toLowerCase()] || null;
    }

    if (!campusId) campusId = 2;
    return campusId;
  }, [user]);

  /** =========================
   *  BASE DATA: rooms + (initial) types
   *  ========================= */
  const loadBaseData = useCallback(async () => {
    if (!user?.campus && !user?.campusId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const campusId = resolveCampusId();

      const [roomsData, typesData] = await Promise.all([
        api.getRooms({ campusId, includeInactive: true, allStatuses: true }),
        getEquipmentTypes().catch(() => []),
      ]);

      const nextRooms = Array.isArray(roomsData) ? roomsData : [];
      const nextTypes = Array.isArray(typesData) ? typesData : [];

      setRooms(nextRooms);
      setEquipmentTypes(nextTypes);

      setSelectedRoomId((prev) => (prev ? prev : nextRooms[0]?.id ? String(nextRooms[0].id) : ""));
    } finally {
      setLoading(false);
    }
  }, [resolveCampusId, user]);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  /** =========================
   *  LOAD TYPES (NO LOOP)
   *  - IMPORTANT: does NOT depend on equipmentTypes
   *  ========================= */
  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const types = await getEquipmentTypes().catch(() => []);
      const safeTypes = Array.isArray(types) ? types : [];
      setEquipmentTypes(safeTypes);

      setRows(
        safeTypes.map((t) => ({
          id: t.id ?? t._id ?? `${t.name}-${Math.random()}`,
          name: t.name ?? "Unknown",
          category: t.category ?? "",
          iconUrl: t.iconUrl ?? "",
          equipmentTypeId: t.id ?? t._id,
          isType: true,

          roomId: null,
          roomName: null,
          quantity: null,
          condition: null,
          _apiCondition: null,
          status: "available",
          description: t.description ?? "",
        }))
      );

      setSelectedRoomName("");
    } finally {
      setLoading(false);
    }
  }, []);

  /** =========================
   *  LOAD INSTANCES
   *  - depends on equipmentTypes for mapping names
   *  ========================= */
  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      if (!selectedRoomId) {
        setRows([]);
        setSelectedRoomName("");
        return;
      }

      const facilityId = Number(selectedRoomId);
      const res = await getEquipmentsByFacility(facilityId);

      const facility = res?.facility ?? null;
      const list = Array.isArray(res?.equipment) ? res.equipment : [];

      const fallbackRoom = rooms.find((r) => String(r.id) === String(selectedRoomId));
      const roomName = facility?.name ?? fallbackRoom?.name ?? `Phòng ${facilityId}`;
      setSelectedRoomName(roomName);

      const mapped = list.map((it) => {
        const typeId = it.equipmentTypeId ?? it.typeId ?? it.equipment_type_id;
        const foundType = equipmentTypes.find((t) => String(t.id ?? t._id) === String(typeId));

        const uiCondition = toUiCondition(it.condition);
        const status = statusFromCondition(uiCondition);

        return {
          id: it.id ?? it._id ?? `${typeId}-${(it.condition || "good")}-${Math.random()}`,
          name: foundType?.name ?? it.name ?? "Equipment",
          category: foundType?.category ?? it.category ?? "",
          iconUrl: foundType?.iconUrl ?? it.iconUrl ?? "",
          equipmentTypeId: typeId ?? null,
          isType: false,

          roomId: facility?.id ?? fallbackRoom?.id ?? facilityId,
          roomName,
          quantity: it.quantity ?? it.qty ?? 0,
          description: it.description ?? "",

          condition: uiCondition,
          _apiCondition: (it.condition ?? "good").toString().toLowerCase(),
          status,
        };
      });

      setRows(mapped);
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, rooms, equipmentTypes]);

  /** =========================
   *  EFFECTS: split by viewMode (avoid loop)
   *  ========================= */
  useEffect(() => {
    if (viewMode === "types") loadTypes();
  }, [viewMode, loadTypes]);

  useEffect(() => {
    if (viewMode === "instances") loadInstances();
  }, [viewMode, loadInstances]);

  const reloadCurrentView = useCallback(async () => {
    if (viewMode === "types") return loadTypes();
    return loadInstances();
  }, [viewMode, loadTypes, loadInstances]);

  const filteredRows = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const category = (item.category || "").toLowerCase();
      const roomName = (item.roomName || "").toLowerCase();
      return name.includes(term) || category.includes(term) || roomName.includes(term);
    });
  }, [rows, keyword]);

  /** =========================
   *  HISTORY (MATCH equipmentService signature)
   *  equipmentService.js: getFacilityEquipmentHistory(facilityId, equipmentTypeId?)
   *  ========================= */
  const fetchHistory = useCallback(async (item) => {
  if (!item || item.isType) {
    setItemHistory([]);
    return;
  }

  const facilityId = toNumberOrNull(item.roomId);
  const equipmentTypeId = toNumberOrNull(item.equipmentTypeId);

  // ✅ bắt buộc đủ cả 2 để lấy đúng lịch sử 1 thiết bị
  if (!facilityId || !equipmentTypeId) {
    setItemHistory([]);
    return;
  }

  try {
    const data = await getFacilityEquipmentHistory(facilityId, {
      equipmentTypeId,
      limit: 50,
      offset: 0,
    });
    setItemHistory(Array.isArray(data) ? data : []);
  } catch (e) {
    setItemHistory([]);
  }
}, []);


  const openCreateModal = () => {
    setEditingItem(null);
    setEditNote("");
    setFormData({
      name: "",
      equipmentTypeId: "",
      roomId: selectedRoomId || "",
      quantity: "",
      condition: "GOOD",
      description: "",
    });
    setShowUpsertModal(true);
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      await createEquipmentType(typeFormData);
      alert("Tạo loại thiết bị thành công!");
      setShowCreateTypeModal(false);
      setTypeFormData({ name: "", iconUrl: "", category: "General" });
      await reloadCurrentView();
    } catch {
      alert("Lỗi khi tạo loại thiết bị!");
    }
  };

  const openDetail = async (item) => {
    setSelectedItem(item);
    setDetailTab("info");
    setShowDetailModal(true);
    // chỉ preload history 1 lần để UI hiển thị số lượng
    await fetchHistory(item);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setEditNote("");

    setFormData({
      name: item.name || "",
      equipmentTypeId: item.equipmentTypeId?.toString() || "",
      roomId: item.roomId?.toString() || selectedRoomId || "",
      quantity: String(item.quantity ?? ""),
      condition: item.condition || "GOOD",
      description: item.description || "",
    });

    setShowUpsertModal(true);
  };

  const handleDelete = async (item) => {
    const ok = window.confirm("Bạn có chắc chắn muốn xóa thiết bị này khỏi phòng?");
    if (!ok) return;

    try {
      await removeFacilityEquipment(item.roomId, item.equipmentTypeId, item._apiCondition || toApiCondition(item.condition));

      alert("Xóa thiết bị khỏi phòng thành công!");
      await reloadCurrentView();

      if (selectedItem && selectedItem.roomId === item.roomId && selectedItem.equipmentTypeId === item.equipmentTypeId) {
        await fetchHistory(selectedItem);
      }
    } catch {
      alert("Lỗi khi xóa thiết bị!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const facilityId = formData.roomId ? Number(formData.roomId) : null;
      const equipmentTypeId = formData.equipmentTypeId ? Number(formData.equipmentTypeId) : null;
      const quantity = Number(formData.quantity);

      if (!facilityId || !Number.isFinite(facilityId)) return alert("Vui lòng chọn phòng!");
      if (!equipmentTypeId || !Number.isFinite(equipmentTypeId)) return alert("Vui lòng chọn loại thiết bị!");
      if (!quantity || quantity < 1) return alert("Số lượng phải >= 1");

      const newConditionApi = toApiCondition(formData.condition);

      if (editingItem) {
        if (!editNote.trim()) return alert("Vui lòng nhập nội dung chỉnh sửa!");

        const oldConditionApi = editingItem._apiCondition || toApiCondition(editingItem.condition);

        // ✅ match Controller BE: Body { quantity, newCondition?, note }
        const payload = {
          quantity,
          note: editNote.trim(),
        };

        if (newConditionApi !== oldConditionApi) {
          payload.newCondition = newConditionApi;
        }

        await updateFacilityEquipment(facilityId, equipmentTypeId, oldConditionApi, payload);
        alert("Cập nhật thiết bị thành công!");
      } else {
        await addEquipmentToFacility(facilityId, {
          equipmentTypeId,
          quantity,
          condition: newConditionApi,
        });
        alert("Thêm thiết bị vào phòng thành công!");
      }

      setShowUpsertModal(false);
      setViewMode("instances");
      setSelectedRoomId(String(facilityId));

      await loadInstances();

      if (selectedItem && !selectedItem.isType) {
        await fetchHistory(selectedItem);
      }
    } catch {
      alert(editingItem ? "Lỗi khi cập nhật thiết bị!" : "Lỗi khi thêm thiết bị!");
    }
  };

  return (
    <AdminLayout>
      <AdminHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên / danh mục / phòng..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setShowCreateTypeModal(true)} variant="secondary" className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Tạo loại thiết bị
              </Button>

              <Button onClick={openCreateModal} className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Thêm thiết bị vào phòng
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("types")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  viewMode === "types"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Xem theo loại thiết bị
              </button>

              <button
                onClick={() => setViewMode("instances")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  viewMode === "instances"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Xem theo phòng
              </button>
            </div>

            {viewMode === "instances" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Chọn phòng:</span>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn phòng --</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={String(room.id)}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!!selectedRoomName && (
                  <div className="text-sm text-gray-700">
                    Thiết bị của phòng: <span className="font-semibold">{selectedRoomName}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AdminHeader>

      <AdminContent>
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold text-gray-700">Tên thiết bị</th>
                    <th className="p-4 font-semibold text-gray-700">Danh mục</th>
                      {viewMode === "instances" && (
                        <>
                          <th className="p-4 font-semibold text-gray-700">Phòng</th>
                          <th className="p-4 font-semibold text-gray-700">Số lượng</th>
                        </>
                      )}
                      <th className="p-4 font-semibold text-gray-700">Trạng thái</th>
                      <th className="p-4 font-semibold text-gray-700 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{item.name}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          {item.category ? (
                            <Badge type="info" className="text-xs">
                              {displayCategoryVi(item.category)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>

                        {viewMode === "instances" && (
                          <>
                            <td className="p-4">
                              {item.roomName ? (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Building2 className="w-4 h-4" />
                                  {item.roomName}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">-</span>
                              )}
                            </td>

                            <td className="p-4 text-gray-600">{`${item.quantity} cái`}</td>
                          </>
                        )}

                        <td className="p-4">
                          <Badge type={badgeTypeFromStatus(item.status)}>{displayStatusVi(item.status)}</Badge>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openDetail(item)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {!item.isType && (
                              <>
                                <button
                                  onClick={() => openEdit(item)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Xóa khỏi phòng"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={viewMode === "instances" ? 6 : 4} className="p-8 text-center text-gray-500">
                        {viewMode === "instances" && !selectedRoomId
                          ? "Hãy chọn phòng để xem danh sách thiết bị."
                          : "Không có dữ liệu phù hợp."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </AdminContent>

      {/* Modal add/edit */}
      {showUpsertModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingItem ? "Cập nhật thiết bị trong phòng" : "Thêm thiết bị vào phòng"}
                </h2>
                <button onClick={() => setShowUpsertModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại thiết bị *</label>
                    <select
                      required
                      value={formData.equipmentTypeId}
                      onChange={(e) => {
                        const selectedType = equipmentTypes.find((t) => String(t.id) === e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          equipmentTypeId: e.target.value,
                          name: selectedType ? selectedType.name : prev.name,
                        }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">-- Chọn loại thiết bị --</option>
                      {equipmentTypes.map((type) => (
                        <option key={type.id} value={String(type.id)}>
                          {type.name} {type.category ? `(${displayCategoryVi(type.category)})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên thiết bị *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ví dụ: Máy chiếu, Loa, Bộ phát wifi..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tên sẽ tự động điền khi chọn loại thiết bị (bạn có thể chỉnh sửa).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phòng *</label>
                      <select
                        required
                        value={formData.roomId}
                        onChange={(e) => setFormData((prev) => ({ ...prev, roomId: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">-- Chọn phòng --</option>
                        {rooms.map((room) => (
                          <option key={room.id} value={String(room.id)}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Ví dụ: 5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tình trạng *</label>
                    <select
                      required
                      value={formData.condition}
                      onChange={(e) => setFormData((prev) => ({ ...prev, condition: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="GOOD">Tốt</option>
                      <option value="POOR">Kém</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Nếu chọn <b>Kém</b> thì trạng thái thiết bị sẽ hiển thị là <b>Sửa chữa</b>.
                    </p>
                  </div>

                  {editingItem && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung chỉnh sửa *</label>
                      <textarea
                        required
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        rows={3}
                        placeholder="Ví dụ: Điều chỉnh số lượng do kiểm kê, đổi tình trạng do thiết bị hỏng..."
                      />
                      <p className="text-xs text-gray-500 mt-1">Nội dung này sẽ được lưu vào lịch sử chỉnh sửa.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả (tùy chọn)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={3}
                      placeholder="Ghi chú thêm về thiết bị..."
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowUpsertModal(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary">
                    {editingItem ? "Cập nhật" : "Thêm"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-6 h-6 text-orange-600" />
                    {selectedItem.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Thông tin chi tiết thiết bị</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                    setItemHistory([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="flex gap-2 mb-6 border-b">
                <button
                  onClick={() => setDetailTab("info")}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    detailTab === "info"
                      ? "text-orange-600 border-b-2 border-orange-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Thông tin
                </button>

                <button
                  onClick={async () => {
                    setDetailTab("history");
                    await fetchHistory(selectedItem);
                  }}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    detailTab === "history"
                      ? "text-orange-600 border-b-2 border-orange-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Lịch sử ({itemHistory.length})
                  </div>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {detailTab === "info" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Danh mục</label>
                        <p className="text-gray-900 font-medium mt-1">{displayCategoryVi(selectedItem.category)}</p>
                      </div>

                      {!selectedItem.isType && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phòng</label>
                          <p className="text-gray-900 font-medium mt-1">{selectedItem.roomName || "-"}</p>
                        </div>
                      )}

                      {!selectedItem.isType && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Số lượng</label>
                          <p className="text-gray-900 font-medium mt-1">{`${selectedItem.quantity} cái`}</p>
                        </div>
                      )}

                      {!selectedItem.isType && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Tình trạng</label>
                          <p className="text-gray-900 font-medium mt-1">{displayConditionVi(selectedItem.condition)}</p>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                        <div className="mt-1">
                          <Badge type={badgeTypeFromStatus(selectedItem.status)}>{displayStatusVi(selectedItem.status)}</Badge>
                        </div>
                      </div>
                    </div>

                    {selectedItem.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Mô tả</label>
                        <p className="text-gray-900 mt-1">{selectedItem.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === "history" && (
                  <div className="space-y-3">
                    {itemHistory.length > 0 ? (
                      itemHistory.map((log) => (
                        <div key={log.id} className="border-l-2 border-gray-200 pl-4 pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{log.action}</p>
                              {log.note && <p className="text-xs text-gray-600 mt-1">{log.note}</p>}

                              <div className="text-xs text-gray-600 mt-2 space-y-1">
                                {log.oldQuantity !== null && log.newQuantity !== null && (
                                  <div>
                                    • Số lượng: {String(log.oldQuantity)} → {String(log.newQuantity)}
                                  </div>
                                )}
                                {log.oldCondition && log.newCondition && (
                                  <div>
                                    • Tình trạng: {String(log.oldCondition)} → {String(log.newCondition)}
                                  </div>
                                )}
                              </div>

                              <p className="text-xs text-gray-500 mt-2">Người thực hiện: {log.createdById ?? "N/A"}</p>
                            </div>

                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Chưa có lịch sử chỉnh sửa.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                    setItemHistory([]);
                  }}
                >
                  Đóng
                </Button>

                {!selectedItem.isType && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setShowDetailModal(false);
                      openEdit(selectedItem);
                    }}
                  >
                    Chỉnh sửa
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Create type modal */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Tạo loại thiết bị mới</h2>
                <button
                  onClick={() => {
                    setShowCreateTypeModal(false);
                    setTypeFormData({ name: "", iconUrl: "", category: "General" });
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateType} className="flex flex-col flex-1 min-h-0">
                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên loại thiết bị *</label>
                    <input
                      type="text"
                      required
                      value={typeFormData.name}
                      onChange={(e) => setTypeFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ví dụ: Máy chiếu 4K, Loa hội trường..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Đường dẫn icon (tùy chọn)</label>
                    <input
                      type="url"
                      value={typeFormData.iconUrl}
                      onChange={(e) => setTypeFormData((prev) => ({ ...prev, iconUrl: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục *</label>
                    <select
                      required
                      value={typeFormData.category}
                      onChange={(e) => setTypeFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="Visual">Hình ảnh</option>
                      <option value="Audio">Âm thanh</option>
                      <option value="Network">Mạng</option>
                      <option value="General">Chung</option>
                    </select>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateTypeModal(false);
                      setTypeFormData({ name: "", iconUrl: "", category: "General" });
                    }}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary">
                    Tạo mới
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
