import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Search, Package, Building2, Eye, History } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import AdminLayout, { AdminHeader, AdminContent } from "../../components/layout/AdminLayout";

export default function EquipmentManagement() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [equipmentHistory, setEquipmentHistory] = useState([]);
  const [detailTab, setDetailTab] = useState("info");
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [viewMode, setViewMode] = useState("types"); // "types" hoặc "instances"
  const [formData, setFormData] = useState({
    name: "",
    equipmentTypeId: "",
    roomId: "",
    quantity: "",
    condition: "GOOD", // GOOD, FAIR, POOR
    description: "",
  });
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [typeFormData, setTypeFormData] = useState({
    name: "",
    iconUrl: "",
    category: "General", // Visual, Audio, Network, General
  });

  useEffect(() => {
    console.log("[EquipmentManagement] useEffect triggered, user:", user);
    console.log("[EquipmentManagement] user?.campus:", user?.campus);
    console.log("[EquipmentManagement] user?.campusId:", user?.campusId);
    
    // Nếu user có campus hoặc campusId, load data
    if (user?.campus || user?.campusId) {
      console.log("[EquipmentManagement] Loading data...");
      loadData();
    } else {
      console.warn("[EquipmentManagement] User không có campus hoặc campusId, không thể load data");
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    console.log("[EquipmentManagement.loadData] Starting, user:", user);
    
    try {
      // Convert user.campus hoặc user.campusId sang campusId
      let campusId = null;
      
      if (user?.campusId) {
        campusId = user.campusId;
      } else if (typeof user?.campus === 'number') {
        campusId = user.campus;
      } else if (typeof user?.campus === 'string') {
        const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
        campusId = campusMap[user.campus.toLowerCase()] || null;
      }

      // Fallback: nếu không có campusId, dùng campusId = 2 (HCM) làm mặc định
      if (!campusId) {
        console.warn("[EquipmentManagement.loadData] Không thể xác định campusId, dùng mặc định campusId = 2 (HCM)");
        campusId = 2; // Default to HCM
      }

      console.log("[EquipmentManagement.loadData] Loading data for campusId:", campusId);

      // Facility Admin chỉ xem equipment và rooms của campus mình
      // Lưu ý: Không có API GET /equipment để lấy danh sách thiết bị thực tế
      // Chỉ có API GET /equipment/types để lấy danh sách loại thiết bị
      const [roomsData, typesData] = await Promise.all([
        api.getRooms({ campusId, includeInactive: true, allStatuses: true }),
        api.getEquipmentTypes().catch(err => {
          console.warn("[EquipmentManagement.loadData] Lỗi tải loại thiết bị:", err);
          return [];
        }),
      ]);
      
      console.log("[EquipmentManagement.loadData] Raw roomsData:", roomsData);
      console.log("[EquipmentManagement.loadData] Raw typesData:", typesData);
      
      // Vì không có API GET /equipment, hiển thị danh sách loại thiết bị để admin quản lý
      // Map equipment types sang format hiển thị
      const equipmentList = (typesData || []).map((type) => ({
        id: type.id,
        name: type.name,
        category: type.category,
        iconUrl: type.iconUrl,
        roomId: null,
        roomName: null,
        quantity: 0, // Không biết số lượng vì không có API
        status: 'available',
        description: type.description || '',
        equipmentTypeId: type.id,
        isType: true, // Đánh dấu đây là loại thiết bị, không phải thiết bị thực tế
      }));
      
      console.log("[EquipmentManagement.loadData] Processed equipment list:", equipmentList);
      console.log("[EquipmentManagement.loadData] Received data:", {
        equipmentCount: equipmentList.length,
        roomsCount: roomsData?.length || 0,
        typesCount: typesData?.length || 0
      });
      
      setEquipment(equipmentList);
      setRooms(roomsData || []);
      setEquipmentTypes(typesData || []);
    } catch (error) {
      console.error("[EquipmentManagement.loadData] Lỗi tải dữ liệu:", error);
      setEquipment([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEquipment(null);
    setFormData({
      name: "",
      equipmentTypeId: "",
      roomId: "",
      quantity: "",
      condition: "GOOD",
      description: "",
    });
    setShowModal(true);
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      await api.createEquipmentType(typeFormData);
      alert("Tạo loại thiết bị thành công!");
      setShowCreateTypeModal(false);
      setTypeFormData({ name: "", iconUrl: "", category: "General" });
      await loadData(); // Reload để cập nhật danh sách loại thiết bị
    } catch (error) {
      alert("Lỗi khi tạo loại thiết bị!");
      console.error(error);
    }
  };

  const handleViewDetail = async (item) => {
    setSelectedEquipment(item);
    setDetailTab("info");
    setShowDetailModal(true);
    try {
      // TODO: Cần API GET để lấy lịch sử thiết bị (chưa có trong 3 API)
      console.warn("API getEquipmentHistory chưa có, bỏ qua");
      setEquipmentHistory([]);
      // const history = await api.getEquipmentHistory(item.id);
      // setEquipmentHistory(history);
    } catch (error) {
      console.error("Lỗi tải chi tiết thiết bị:", error);
      setEquipmentHistory([]);
    }
  };

  const handleEdit = (item) => {
    setEditingEquipment(item);
    setFormData({
      name: item.name,
      equipmentTypeId: item.equipmentTypeId?.toString() || "",
      roomId: item.roomId?.toString() || "",
      quantity: item.quantity.toString(),
      condition: item.condition || "GOOD",
      description: item.description || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa thiết bị này?")) return;
    
    try {
      // TODO: Cần API DELETE để xóa thiết bị (chưa có trong 3 API)
      alert("Chức năng xóa thiết bị chưa được hỗ trợ. API này chưa có trong backend.");
      // await api.deleteEquipment(id);
      // await loadData();
      // alert("Xóa thiết bị thành công!");
    } catch (error) {
      alert("Lỗi khi xóa thiết bị!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        equipmentTypeId: formData.equipmentTypeId ? parseInt(formData.equipmentTypeId) : null,
        roomId: formData.roomId ? parseInt(formData.roomId) : null,
        quantity: parseInt(formData.quantity),
      };

      // Sử dụng API POST /equipment/facilities/{facilityId} để thêm thiết bị vào phòng
      if (editingEquipment) {
        // TODO: Cần API PUT/PATCH để cập nhật thiết bị (chưa có trong 3 API)
        alert("Chức năng cập nhật thiết bị chưa được hỗ trợ. API này chưa có trong backend.");
        return;
      } else {
        // Sử dụng API POST /equipment/facilities/{facilityId}
        if (!submitData.roomId) {
          alert("Vui lòng chọn phòng để thêm thiết bị!");
          return;
        }
        if (!submitData.equipmentTypeId) {
          alert("Vui lòng chọn loại thiết bị!");
          return;
        }
        await api.addEquipmentToFacility(submitData.roomId, {
          equipmentTypeId: submitData.equipmentTypeId,
          quantity: submitData.quantity,
          condition: submitData.condition || "GOOD",
        });
        alert("Thêm thiết bị vào phòng thành công!");
      }
      
      setShowModal(false);
      await loadData();
    } catch (error) {
      alert(editingEquipment ? "Lỗi khi cập nhật thiết bị!" : "Lỗi khi tạo thiết bị!");
    }
  };

  const filteredEquipment = equipment.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.roomName && item.roomName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      {/* Toolbar - Fixed Header */}
      <AdminHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm thiết bị..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowCreateTypeModal(true)} 
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Tạo loại thiết bị
            </Button>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Thêm thiết bị vào phòng
            </Button>
          </div>
        </div>
      </AdminHeader>

      {/* Content - Scrollable */}
      <AdminContent>
        {/* Table */}
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
                  <th className="p-4 font-semibold text-gray-700">Loại</th>
                  <th className="p-4 font-semibold text-gray-700">Phòng</th>
                  <th className="p-4 font-semibold text-gray-700">Số lượng</th>
                  <th className="p-4 font-semibold text-gray-700">Trạng thái</th>
                  <th className="p-4 font-semibold text-gray-700 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEquipment.length > 0 ? (
                  filteredEquipment.map((item) => (
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
                            {item.category}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {item.roomName ? (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Building2 className="w-4 h-4" />
                            {item.roomName}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Chưa gán</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600">
                        {item.isType ? (
                          <span className="text-gray-400 italic">-</span>
                        ) : (
                          `${item.quantity} cái`
                        )}
                      </td>
                      <td className="p-4">
                        <Badge
                          type={
                            item.status === "available" ? "success" :
                            item.status === "maintenance" ? "warning" : "danger"
                          }
                        >
                          {item.status === "available" ? "Sẵn sàng" :
                           item.status === "maintenance" ? "Bảo trì" : "Hỏng"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(item)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!item.isType && (
                            <>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xóa"
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
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      Không tìm thấy thiết bị nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </AdminContent>

      {/* Modal Create/Edit - Scrollable Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingEquipment ? "Chỉnh sửa thiết bị" : "Thêm thiết bị mới"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại thiết bị *
                </label>
                <select
                  required
                  value={formData.equipmentTypeId}
                  onChange={(e) => {
                    const selectedType = equipmentTypes.find(t => t.id.toString() === e.target.value);
                    setFormData({ 
                      ...formData, 
                      equipmentTypeId: e.target.value,
                      name: selectedType ? selectedType.name : formData.name
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">-- Chọn loại thiết bị --</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} {type.category ? `(${type.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên thiết bị *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="VD: Máy chiếu, Loa, Bàn ghế..."
                />
                <p className="text-xs text-gray-500 mt-1">Tên thiết bị sẽ tự động điền khi chọn loại thiết bị, bạn có thể chỉnh sửa</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phòng (tùy chọn)
                  </label>
                  <select
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn phòng --</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số lượng *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="VD: 5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tình trạng *
                </label>
                <select
                  required
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="GOOD">Tốt</option>
                  <option value="FAIR">Khá</option>
                  <option value="POOR">Kém</option>
                </select>
              </div>

              </div>

              <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary">
                  {editingEquipment ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
            </Card>
          </div>
        </div>
      )}

      {/* Detail Modal - Scrollable Overlay */}
      {showDetailModal && selectedEquipment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-6 h-6 text-orange-600" />
                  {selectedEquipment.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Chi tiết thiết bị và lịch sử</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEquipment(null);
                  setEquipmentHistory([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
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
                onClick={() => setDetailTab("history")}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  detailTab === "history"
                    ? "text-orange-600 border-b-2 border-orange-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Lịch sử ({equipmentHistory.length})
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {detailTab === "info" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phòng</label>
                      <p className="text-gray-900 font-medium mt-1">
                        {selectedEquipment.roomName || <span className="text-gray-400 italic">Chưa gán</span>}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Số lượng</label>
                      <p className="text-gray-900 font-medium mt-1">{selectedEquipment.quantity} cái</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                      <div className="mt-1">
                        <Badge
                          type={
                            selectedEquipment.status === "available" ? "success" :
                            selectedEquipment.status === "maintenance" ? "warning" : "danger"
                          }
                        >
                          {selectedEquipment.status === "available" ? "Sẵn sàng" :
                           selectedEquipment.status === "maintenance" ? "Bảo trì" : "Hỏng"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {selectedEquipment.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mô tả</label>
                      <p className="text-gray-900 mt-1">{selectedEquipment.description}</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "history" && (
                <div className="space-y-3">
                  {equipmentHistory.length > 0 ? (
                    equipmentHistory.map((log, idx) => (
                      <div key={idx} className="border-l-2 border-gray-200 pl-4 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{log.action}</p>
                            {log.changes && (
                              <p className="text-xs text-gray-600 mt-1">{log.changes}</p>
                            )}
                            {log.userName && (
                              <p className="text-xs text-gray-500 mt-1">Bởi: {log.userName}</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">{log.timestamp}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Chưa có lịch sử thay đổi.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEquipment(null);
                  setEquipmentHistory([]);
                }}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(selectedEquipment);
                }}
              >
                Chỉnh sửa
              </Button>
            </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Tạo loại thiết bị */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Tạo loại thiết bị mới
                </h2>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên loại thiết bị *
                    </label>
                    <input
                      type="text"
                      required
                      value={typeFormData.name}
                      onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="VD: Projector 4K, Speaker System..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon URL (tùy chọn)
                    </label>
                    <input
                      type="url"
                      value={typeFormData.iconUrl}
                      onChange={(e) => setTypeFormData({ ...typeFormData, iconUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Danh mục *
                    </label>
                    <select
                      required
                      value={typeFormData.category}
                      onChange={(e) => setTypeFormData({ ...typeFormData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="Visual">Visual</option>
                      <option value="Audio">Audio</option>
                      <option value="Network">Network</option>
                      <option value="General">General</option>
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

