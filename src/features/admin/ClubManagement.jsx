import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Search, Users, UserPlus, Building2, Eye, History } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";

export default function ClubManagement() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [selectedClub, setSelectedClub] = useState(null);
  const [viewingClub, setViewingClub] = useState(null);
  const [clubHistory, setClubHistory] = useState([]);
  const [detailTab, setDetailTab] = useState("info");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priorityRoomIds: [],
  });

  useEffect(() => {
    if (user?.campus) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.campus) return;
    setLoading(true);
    try {
      // Facility Admin chỉ xem clubs và rooms của campus mình
      const [clubsData, roomsData] = await Promise.all([
        api.getAllClubs(user.campus),
        api.getAllRooms(user.campus),
      ]);
      setClubs(clubsData);
      setRooms(roomsData);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingClub(null);
    setFormData({
      name: "",
      description: "",
      priorityRoomIds: [],
    });
    setShowModal(true);
  };

  const handleEdit = (club) => {
    setEditingClub(club);
    setFormData({
      name: club.name,
      description: club.description || "",
      priorityRoomIds: club.priorityRoomIds || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa CLB này?")) return;
    
    try {
      await api.deleteClub(id);
      await loadData();
      alert("Xóa CLB thành công!");
    } catch (error) {
      alert("Lỗi khi xóa CLB!");
    }
  };

  const handleManageLeaders = (club) => {
    setSelectedClub(club);
    setShowLeaderModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClub) {
        await api.updateClub(editingClub.id, formData);
        alert("Cập nhật CLB thành công!");
      } else {
        await api.createClub(formData);
        alert("Tạo CLB thành công!");
      }
      
      setShowModal(false);
      await loadData();
    } catch (error) {
      alert(editingClub ? "Lỗi khi cập nhật CLB!" : "Lỗi khi tạo CLB!");
    }
  };

  const togglePriorityRoom = (roomId) => {
    setFormData((prev) => ({
      ...prev,
      priorityRoomIds: prev.priorityRoomIds.includes(roomId)
        ? prev.priorityRoomIds.filter((id) => id !== roomId)
        : [...prev.priorityRoomIds, roomId],
    }));
  };

  const filteredClubs = clubs.filter((club) =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm CLB..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Thêm CLB mới
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
                  <th className="p-4 font-semibold text-gray-700">Tên CLB</th>
                  <th className="p-4 font-semibold text-gray-700">Số Leader</th>
                  <th className="p-4 font-semibold text-gray-700">Phòng ưu tiên</th>
                  <th className="p-4 font-semibold text-gray-700 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClubs.length > 0 ? (
                  filteredClubs.map((club) => (
                    <tr key={club.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="font-medium text-gray-900">{club.name}</span>
                            {club.description && (
                              <p className="text-xs text-gray-500 mt-1">{club.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge type="info">{club.leaderCount || 0} người</Badge>
                      </td>
                      <td className="p-4">
                        {club.priorityRoomNames && club.priorityRoomNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {club.priorityRoomNames.slice(0, 2).map((roomName, idx) => (
                              <Badge key={idx} type="success" className="text-xs">
                                {roomName}
                              </Badge>
                            ))}
                            {club.priorityRoomNames.length > 2 && (
                              <Badge type="secondary" className="text-xs">
                                +{club.priorityRoomNames.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm italic">Chưa có</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(club)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleManageLeaders(club)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Quản lý Leader"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(club)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(club.id)}
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
                    <td colSpan="4" className="p-8 text-center text-gray-500">
                      Không tìm thấy CLB nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Create/Edit Club */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClub ? "Chỉnh sửa CLB" : "Thêm CLB mới"}
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
                  Tên CLB *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="VD: CLB Nhạc, CLB Thể thao..."
                />
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
                  placeholder="Mô tả về CLB..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phòng ưu tiên (chọn nhiều)
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                  {rooms.length > 0 ? (
                    rooms.map((room) => (
                      <label
                        key={room.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.priorityRoomIds.includes(room.id)}
                          onChange={() => togglePriorityRoom(room.id)}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{room.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">({room.type})</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">
                      Chưa có phòng nào trong hệ thống.
                    </p>
                  )}
                </div>
                {formData.priorityRoomIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Đã chọn {formData.priorityRoomIds.length} phòng
                  </p>
                )}
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
                  {editingClub ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Manage Leaders */}
      {showLeaderModal && selectedClub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Quản lý Leader - {selectedClub.name}
              </h2>
              <button
                onClick={() => setShowLeaderModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Tính năng quản lý Leader sẽ được tích hợp với API để thêm/xóa sinh viên làm Leader của CLB.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">
                  API endpoint: <code className="bg-white px-2 py-1 rounded">POST /api/clubs/{selectedClub.id}/leaders</code>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  API endpoint: <code className="bg-white px-2 py-1 rounded">DELETE /api/clubs/{selectedClub.id}/leaders/:studentId</code>
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowLeaderModal(false)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && viewingClub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-6 h-6 text-orange-600" />
                  {viewingClub.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Chi tiết CLB và lịch sử</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setViewingClub(null);
                  setClubHistory([]);
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
                  Lịch sử ({clubHistory.length})
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {detailTab === "info" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mô tả</label>
                    <p className="text-gray-900 mt-1">
                      {viewingClub.description || <span className="text-gray-400 italic">Chưa có mô tả</span>}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Số Leader</label>
                    <p className="text-gray-900 font-medium mt-1">{viewingClub.leaderCount || 0} người</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Phòng ưu tiên</label>
                    {viewingClub.priorityRoomNames && viewingClub.priorityRoomNames.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {viewingClub.priorityRoomNames.map((roomName, idx) => (
                          <Badge key={idx} type="success">
                            {roomName}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">Chưa có phòng ưu tiên</p>
                    )}
                  </div>
                </div>
              )}

              {detailTab === "history" && (
                <div className="space-y-3">
                  {clubHistory.length > 0 ? (
                    clubHistory.map((log, idx) => (
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
                  setViewingClub(null);
                  setClubHistory([]);
                }}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(viewingClub);
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

