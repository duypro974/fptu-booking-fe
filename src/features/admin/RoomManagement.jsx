import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Search, Users, Building2, Eye, Calendar, History } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";

export default function RoomManagement() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomBookings, setRoomBookings] = useState([]);
  const [roomHistory, setRoomHistory] = useState([]);
  const [detailTab, setDetailTab] = useState("info");
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    campus: user?.campus || "hcm",
    type: "Học tập",
    capacity: "",
    status: "active",
    description: "",
  });

  useEffect(() => {
    if (user?.campus) {
      loadRooms();
      setFormData(prev => ({ ...prev, campus: user.campus }));
    }
  }, [user]);

  const loadRooms = async () => {
    if (!user?.campus) return;
    setLoading(true);
    try {
      // Facility Admin chỉ xem phòng của campus mình
      const data = await api.getAllRooms(user.campus);
      setRooms(data);
    } catch (error) {
      console.error("Lỗi tải danh sách phòng:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRoom(null);
    setFormData({
      name: "",
      campus: user?.campus || "hcm", // Tự động dùng campus của admin
      type: "Học tập",
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
    // Load thêm dữ liệu
    try {
      const [bookings, history] = await Promise.all([
        api.getRoomBookings(room.id),
        api.getRoomHistory(room.id)
      ]);
      setRoomBookings(bookings);
      setRoomHistory(history);
    } catch (error) {
      console.error("Lỗi tải chi tiết phòng:", error);
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
      const submitData = {
        ...formData,
        capacity: parseInt(formData.capacity),
      };

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
      alert(editingRoom ? "Lỗi khi cập nhật phòng!" : "Lỗi khi tạo phòng!");
    }
  };

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roomTypes = ["Học tập", "Sự kiện", "Thực hành", "Họp", "Lab", "Khác"];
  const campuses = api.getCampuses();

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Thêm phòng mới
        </Button>
      </div>

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

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    value={campuses.find(c => c.id === formData.campus)?.name || formData.campus}
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
                  >
                    {roomTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
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

              <div className="flex justify-end gap-3 pt-4">
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
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
                }}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(selectedRoom);
                }}
              >
                Chỉnh sửa
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

