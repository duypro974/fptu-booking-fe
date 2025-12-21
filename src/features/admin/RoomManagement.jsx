import { useEffect, useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Search, Users, Building2, Eye, Calendar, History } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import AdminLayout, { AdminHeader, AdminContent } from "../../components/layout/AdminLayout";

export default function RoomManagement() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "active", "inactive", "maintenance"
  const [typeFilter, setTypeFilter] = useState("all"); // "all" hoặc tên loại phòng
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomBookings, setRoomBookings] = useState([]);
  const [roomHistory, setRoomHistory] = useState([]);
  const [roomEquipment, setRoomEquipment] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [detailTab, setDetailTab] = useState("info");
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    campus: user?.campus || "hcm",
    type: "",
    capacity: "",
    status: "active",
    description: "",
  });

  useEffect(() => {
    console.log("[RoomManagement] useEffect triggered, user:", user);
    console.log("[RoomManagement] user?.campus:", user?.campus);
    console.log("[RoomManagement] user?.campusId:", user?.campusId);
    
    // Nếu user có campus hoặc campusId, load data
    if (user?.campus || user?.campusId) {
      const campus = user.campus || (user.campusId === 1 ? 'hn' : user.campusId === 2 ? 'hcm' : 'hcm');
      console.log("[RoomManagement] Loading data for campus:", campus);
      loadFacilityTypes();
      loadRooms();
      setFormData(prev => ({ ...prev, campus: campus }));
    } else {
      console.warn("[RoomManagement] User không có campus hoặc campusId, không thể load data");
      setLoading(false);
    }
  }, [user]);

  const loadFacilityTypes = async () => {
    try {
      const types = await api.getFacilityTypes();
      setFacilityTypes(types);
      // Set default type nếu chưa có
      if (types.length > 0 && !formData.type) {
        setFormData(prev => ({ ...prev, type: types[0].name }));
      }
    } catch (error) {
      console.error("Lỗi tải loại phòng:", error);
      // Fallback to default types
      const defaultTypes = [
        { id: 1, name: "Học tập" },
        { id: 2, name: "Sự kiện" },
        { id: 3, name: "Thực hành" },
        { id: 4, name: "Họp" },
        { id: 5, name: "Lab" },
        { id: 6, name: "Khác" },
      ];
      setFacilityTypes(defaultTypes);
      if (!formData.type) {
        setFormData(prev => ({ ...prev, type: defaultTypes[0].name }));
      }
    }
  };

  const loadRooms = async () => {
    setLoading(true);
    console.log("[RoomManagement.loadRooms] Starting, user:", user);
    
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

      console.log("[RoomManagement.loadRooms] Loading rooms for campusId:", campusId, "user:", user);

      // Fallback: nếu không có campusId, dùng campusId = 2 (HCM) làm mặc định
      if (!campusId) {
        console.warn("[RoomManagement.loadRooms] Không thể xác định campusId, dùng mặc định campusId = 2 (HCM)");
        campusId = 2; // Default to HCM
      }

      // Facility Admin chỉ xem phòng của campus mình (bao gồm cả inactive và maintenance)
      console.log("[RoomManagement.loadRooms] Calling api.getRooms...");
      const data = await api.getRooms({ 
        campusId,
        includeInactive: true,
        allStatuses: true 
      });
      console.log("[RoomManagement.loadRooms] Received data:", data?.length || 0, "rooms");
      // Log rooms with maintenance status for debugging
      const maintenanceRooms = data?.filter(room => String(room.status || '').toLowerCase() === 'maintenance') || [];
      console.log("[RoomManagement.loadRooms] Maintenance rooms count:", maintenanceRooms.length, maintenanceRooms);
      setRooms(data || []);
    } catch (error) {
      console.error("[RoomManagement.loadRooms] Lỗi tải danh sách phòng:", error);
      console.error("[RoomManagement.loadRooms] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setRooms([]);
      // Hiển thị thông báo lỗi cho user
      if (error.message?.includes('TIMEOUT')) {
        alert("Request timeout. Vui lòng thử lại sau.");
      } else if (error.message?.includes('CONNECTION_ERROR')) {
        alert("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.");
      }
    } finally {
      setLoading(false);
      console.log("[RoomManagement.loadRooms] Loading completed");
    }
  };

  const handleCreate = () => {
    setEditingRoom(null);
    const defaultType = facilityTypes.length > 0 ? facilityTypes[0].name : "Học tập";
    setFormData({
      name: "",
      campus: user?.campus || "hcm", // Tự động dùng campus của admin
      type: defaultType,
      capacity: "",
      status: "active",
      description: "",
    });
    setShowModal(true);
  };

  const handleViewDetail = async (room) => {
    setSelectedRoom(room);
    setDetailTab("info");
    setShowDetailModal(true);
    // Reset equipment state
    setRoomEquipment([]);
    setLoadingEquipment(true);
    
    // Load thêm dữ liệu
    try {
      const [bookings, history, equipment] = await Promise.all([
        api.getRoomBookings(room.id),
        api.getRoomHistory(room.id),
        api.getFacilityEquipment(room.id)
      ]);
      setRoomBookings(bookings);
      setRoomHistory(history);
      setRoomEquipment(equipment || []);
    } catch (error) {
      console.error("Lỗi tải chi tiết phòng:", error);
      setRoomEquipment([]);
    } finally {
      setLoadingEquipment(false);
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      campus: room.campus,
      type: room.type,
      capacity: room.capacity.toString(),
      status: room.status,
      description: room.description || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phòng này?")) return;
    
    try {
      await api.deleteRoom(id);
      await loadRooms();
      alert("Xóa phòng thành công!");
    } catch (error) {
      alert("Lỗi khi xóa phòng!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert campus string sang campusId number
      let campusId = null;
      if (typeof formData.campus === 'number') {
        campusId = formData.campus;
      } else if (typeof formData.campus === 'string') {
        const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
        campusId = campusMap[formData.campus.toLowerCase()] || null;
      } else if (user?.campusId) {
        campusId = user.campusId;
      }

      // Tìm typeId từ facilityTypes
      const selectedType = facilityTypes.find(t => t.name === formData.type || t.id === formData.type);
      const typeId = selectedType?.id || (typeof formData.type === 'number' ? formData.type : null);

      if (!campusId) {
        alert("Không thể xác định campus. Vui lòng thử lại.");
        return;
      }

      if (!typeId) {
        alert("Vui lòng chọn loại phòng.");
        return;
      }

      // Tạo payload đúng format cho backend
      // Map status từ frontend (active/inactive/maintenance) sang backend (ACTIVE/INACTIVE/MAINTENANCE)
      let backendStatus = "INACTIVE"; // default
      if (formData.status === "active") {
        backendStatus = "ACTIVE";
      } else if (formData.status === "maintenance") {
        backendStatus = "MAINTENANCE";
      } else if (formData.status === "inactive") {
        backendStatus = "INACTIVE";
      }

      const submitData = {
        name: formData.name,
        description: formData.description || "",
        campusId: campusId,
        typeId: typeId,
        capacity: parseInt(formData.capacity) || 0,
        status: backendStatus,
      };

      console.log('[handleSubmit] Submitting data:', submitData);

      if (editingRoom) {
        await api.updateRoom(editingRoom.id, submitData);
        alert("Cập nhật phòng thành công!");
      } else {
        await api.createRoom(submitData);
        alert("Tạo phòng thành công!");
      }
      
      setShowModal(false);
      await loadRooms();
    } catch (error) {
      console.error('[handleSubmit] Error:', error);
      alert(editingRoom ? `Lỗi khi cập nhật phòng: ${error.message}` : `Lỗi khi tạo phòng: ${error.message}`);
    }
  };

  // Lấy danh sách các loại phòng duy nhất từ rooms
  const uniqueTypes = useMemo(() => {
    const types = new Set();
    rooms.forEach((room) => {
      if (room.type) {
        types.add(room.type);
      }
    });
    return Array.from(types).sort();
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const filtered = rooms.filter((room) => {
      // Filter theo search term
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           room.type?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter theo status (normalize cả hai phía để tránh lỗi case sensitivity)
      const roomStatus = String(room.status || '').toLowerCase();
      const filterStatus = String(statusFilter || '').toLowerCase();
      const matchesStatus = filterStatus === "all" || roomStatus === filterStatus;
      
      // Filter theo loại phòng
      const matchesType = typeFilter === "all" || room.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
    
    // Debug log khi filter maintenance
    if (statusFilter === "maintenance") {
      console.log("[RoomManagement.filteredRooms] Filtering maintenance rooms:", {
        totalRooms: rooms.length,
        maintenanceRooms: rooms.filter(r => String(r.status || '').toLowerCase() === 'maintenance').length,
        filteredCount: filtered.length,
        statusFilter
      });
    }
    
    return filtered;
  }, [rooms, searchTerm, statusFilter, typeFilter]);

  const campuses = api.getCampuses();
  
  // Helper để lấy tên campus từ ID (hỗ trợ cả string và number)
  const getCampusName = (campusId) => {
    // Nếu là số, map sang string
    const campusMap = { 1: "hn", 2: "hcm", 3: "dn", 4: "ct", 5: "qn" };
    const campusString = typeof campusId === 'number' ? campusMap[campusId] : campusId;
    
    // Tìm tên campus từ campuses array
    const campus = campuses.find(c => c.id === campusString);
    if (campus) return campus.name;
    
    // Fallback: map trực tiếp
    if (campusString === "hcm") return "FPTU TP.HCM (Quận 9)";
    if (campusString === "hn") return "FPTU Hòa Lạc (Hà Nội)";
    if (campusString === "dn") return "FPTU Đà Nẵng";
    if (campusString === "ct") return "FPTU Cần Thơ";
    if (campusString === "qn") return "FPTU Quy Nhơn";
    
    // Nếu là số, trả về tên tương ứng
    if (campusId === 1) return "FPTU Hòa Lạc (Hà Nội)";
    if (campusId === 2) return "FPTU TP.HCM (Quận 9)";
    if (campusId === 3) return "FPTU Đà Nẵng";
    if (campusId === 4) return "FPTU Cần Thơ";
    if (campusId === 5) return "FPTU Quy Nhơn";
    
    return campusId; // Fallback cuối cùng
  };

  return (
    <AdminLayout>
      {/* Toolbar - Fixed Header */}
      <AdminHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-1 flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          {/* Filter theo status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium cursor-pointer min-w-[160px]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="maintenance">Bảo trì</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>

          {/* Filter theo loại phòng */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium cursor-pointer min-w-[160px]"
          >
            <option value="all">Tất cả loại</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Thêm phòng mới
        </Button>
        </div>
      </AdminHeader>

      {/* Content - Scrollable */}
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
                  <th className="p-4 font-semibold text-gray-700">Tên phòng</th>
                  <th className="p-4 font-semibold text-gray-700">Loại</th>
                  <th className="p-4 font-semibold text-gray-700">Sức chứa</th>
                  <th className="p-4 font-semibold text-gray-700">Trạng thái</th>
                  <th className="p-4 font-semibold text-gray-700 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRooms.length > 0 ? (
                  filteredRooms.map((room) => (
                    <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{room.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{room.type}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="w-4 h-4" />
                          {room.capacity} người
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          type={
                            room.status === "active" ? "success" :
                            room.status === "maintenance" ? "warning" : "danger"
                          }
                        >
                          {room.status === "active" ? "Hoạt động" :
                           room.status === "maintenance" ? "Bảo trì" : "Ngừng hoạt động"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(room)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(room)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(room.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      Không tìm thấy phòng nào.
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
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          
          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRoom ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
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
                  Tên phòng *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="VD: Phòng Seminar 201"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campus
                  </label>
                  <input
                    type="text"
                    value={user?.campusName || getCampusName(formData.campus)}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Campus được gán tự động theo tài khoản của bạn</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại phòng *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={facilityTypes.length === 0}
                  >
                    {facilityTypes.length === 0 ? (
                      <option value="">Đang tải...</option>
                    ) : (
                      facilityTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sức chứa (người) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="VD: 30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="maintenance">Bảo trì</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Mô tả về phòng..."
                />
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
                  {editingRoom ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
            </Card>
          </div>
        </div>
      )}

      {/* Detail Modal - Scrollable Overlay */}
      {showDetailModal && selectedRoom && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          
          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-orange-600" />
                  {selectedRoom.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Chi tiết phòng và lịch sử</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRoom(null);
                  setRoomBookings([]);
                  setRoomHistory([]);
                  setRoomEquipment([]);
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
                onClick={() => setDetailTab("bookings")}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  detailTab === "bookings"
                    ? "text-orange-600 border-b-2 border-orange-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Lịch booking ({roomBookings.length})
                </div>
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
                  Lịch sử ({roomHistory.length})
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {detailTab === "info" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Loại phòng</label>
                      <p className="text-gray-900 font-medium mt-1">{selectedRoom.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Sức chứa</label>
                      <p className="text-gray-900 font-medium mt-1">{selectedRoom.capacity} người</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                      <div className="mt-1">
                        <Badge
                          type={
                            selectedRoom.status === "active" ? "success" :
                            selectedRoom.status === "maintenance" ? "warning" : "danger"
                          }
                        >
                          {selectedRoom.status === "active" ? "Hoạt động" :
                           selectedRoom.status === "maintenance" ? "Bảo trì" : "Ngừng hoạt động"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Thiết bị</label>
                      <div className="mt-1">
                        {loadingEquipment ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                            <span className="text-sm">Đang tải...</span>
                          </div>
                        ) : roomEquipment.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {roomEquipment.map((equipment, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                              >
                                {equipment}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Chưa cập nhật thiết bị</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedRoom.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mô tả</label>
                      <p className="text-gray-900 mt-1">{selectedRoom.description}</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "bookings" && (
                <div className="space-y-3">
                  {roomBookings.length > 0 ? (
                    roomBookings.map((booking) => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">#{booking.bookingCode}</span>
                              <Badge
                                type={
                                  booking.status === "approved" ? "success" :
                                  booking.status === "rejected" ? "danger" :
                                  booking.status === "completed" ? "info" : "warning"
                                }
                              >
                                {booking.status === "approved" ? "Đã duyệt" :
                                 booking.status === "rejected" ? "Từ chối" :
                                 booking.status === "completed" ? "Hoàn thành" : "Chờ duyệt"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">{booking.userName}</span> • {booking.date} • {booking.startTime} - {booking.endTime}
                            </p>
                            {booking.reason && (
                              <p className="text-xs text-gray-500 mt-1 italic">"{booking.reason}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Chưa có booking nào cho phòng này.</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "history" && (
                <div className="space-y-3">
                  {roomHistory.length > 0 ? (
                    roomHistory.map((log, idx) => (
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
                  setSelectedRoom(null);
                  setRoomBookings([]);
                  setRoomHistory([]);
                  setRoomEquipment([]);
                }}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailModal(false);
                  setRoomEquipment([]);
                  handleEdit(selectedRoom);
                }}
              >
                Chỉnh sửa
              </Button>
            </div>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

