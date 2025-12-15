import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Search, Users, UserPlus, Building2, Eye, History } from "lucide-react";
import { api } from "../../services/api";
import { addClubPriority, removeClubPriority } from "../../services/clubService";
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
    if (user?.campus || user?.campusId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    console.log('[ClubManagement.loadData] Starting, user:', user);
    
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
        console.warn('[ClubManagement.loadData] Không thể xác định campusId, dùng mặc định campusId = 2 (HCM)');
        campusId = 2; // Default to HCM
      }

      console.log('[ClubManagement.loadData] Loading data for campus:', {
        userCampus: user?.campus,
        userCampusId: user?.campusId,
        campusId,
        userId: user?.id
      });

      // Facility Admin chỉ xem clubs và rooms của campus mình
      const [clubsData, roomsData] = await Promise.all([
        api.getClubs(campusId),
        api.getRooms({ campusId }),
      ]);
      
      console.log('[ClubManagement.loadData] Data loaded:', {
        clubsCount: clubsData?.length || 0,
        roomsCount: roomsData?.length || 0,
        clubsData: clubsData // Log toàn bộ để debug
      });
      
      // Đảm bảo clubsData là array hợp lệ
      if (!Array.isArray(clubsData)) {
        console.error('[ClubManagement.loadData] clubsData is not an array:', clubsData);
        setClubs([]);
        setRooms(roomsData || []);
        setLoading(false);
        return;
      }

      // Load thêm thông tin leader và priority rooms cho mỗi club
      // Dùng Promise.allSettled thay vì Promise.all để không bị fail toàn bộ nếu 1 club lỗi
      const clubsWithDetailsPromises = (clubsData || []).map(async (club, index) => {
        // Xử lý an toàn: nếu club là null/undefined, tạo object mặc định
        if (!club || typeof club !== 'object') {
          console.warn('[ClubManagement.loadData] Club at index', index, 'is null/undefined, skipping');
          return null;
        }

        try {
          // Load priority rooms
          let priorityRoomNames = [];
          try {
            // Chỉ gọi API nếu club có id hợp lệ
            if (club.id !== null && club.id !== undefined) {
              const priorities = await api.getClubPriorityRooms(club.id);
              console.log('[ClubManagement.loadData] Priority rooms for club', club.id, ':', priorities);
              console.log('[ClubManagement.loadData] Priority rooms count:', priorities?.length || 0);
              
              // API getClubPriorityRooms trả về array với format: {id: facilityId, name: facility.name, isPriority: true}
              if (Array.isArray(priorities) && priorities.length > 0) {
                console.log('[ClubManagement.loadData] Processing', priorities.length, 'priorities for club', club.id);
                
                // Đơn giản hóa: lấy name trực tiếp từ priorities, không filter gì cả
                priorityRoomNames = priorities
                  .map((p) => {
                    // Xử lý an toàn cho null/undefined
                    if (!p || typeof p !== 'object') return null;
                    
                    // Ưu tiên: p.name (từ API mapping) > p.facility?.name > tìm trong roomsData
                    if (p.name) {
                      return p.name;
                    }
                    if (p.facility?.name) {
                      return p.facility.name;
                    }
                    // Tìm trong roomsData
                    const facilityId = p.facilityId || p.id;
                    if (facilityId && roomsData && roomsData.length > 0) {
                      const room = roomsData.find(r => {
                        return r && (r.id === facilityId || r.id === parseInt(facilityId) || r.id?.toString() === facilityId?.toString());
                      });
                      if (room) {
                        return room.name || room.facilityName || null;
                      }
                    }
                    // Fallback
                    return p.facilityName || p.facility?.facilityName || null;
                  })
                  .filter(name => name !== null && name !== undefined && name !== ''); // Chỉ filter null/undefined/empty string
                
                console.log('[ClubManagement.loadData] Mapped', priorityRoomNames.length, 'priority room names from', priorities.length, 'priorities');
                console.log('[ClubManagement.loadData] Priority room names:', priorityRoomNames);
              }
            }
          } catch (error) {
            console.error('[ClubManagement.loadData] Error loading priority rooms for club', club.id, ':', error);
            // Nếu API lỗi, thử lấy từ club object nếu có
            if (club.priorityRoomNames && Array.isArray(club.priorityRoomNames)) {
              priorityRoomNames = club.priorityRoomNames;
              console.log('[ClubManagement.loadData] Using fallback priority room names from club object:', priorityRoomNames);
            }
            // Nếu không có, giữ mảng rỗng (đã set default ở trên)
          }

          // Tính leader count - Xử lý an toàn cho null/undefined
          let leaderCount = 0;
          if (club.leaderEmail) {
            leaderCount = 1;
          } else if (club.leaderId !== null && club.leaderId !== undefined) {
            leaderCount = 1;
          } else if (club.leader) {
            leaderCount = 1;
          } else if (Array.isArray(club.leaders) && club.leaders.length > 0) {
            leaderCount = club.leaders.length;
          }

          // QUAN TRỌNG: Dùng spread operator để giữ lại TOÀN BỘ dữ liệu gốc từ API
          // Sau đó mới thêm/bổ sung các trường mới (priorityRoomNames, leaderCount)
          // Đảm bảo tất cả trường gốc được giữ nguyên, kể cả khi null/undefined
          return {
            ...club, // Giữ nguyên TẤT CẢ dữ liệu gốc: id, name, code, description, campus, campusId, leaderEmail, leaderId, leader, leaders, etc.
            priorityRoomNames: priorityRoomNames || [], // Bổ sung thêm, đảm bảo luôn là array
            leaderCount: leaderCount || 0 // Bổ sung thêm, đảm bảo luôn là number
          };
        } catch (error) {
          console.error('[ClubManagement.loadData] Error loading details for club', club?.id || index, ':', error);
          // Vẫn giữ nguyên dữ liệu gốc, chỉ set default cho các trường mới
          // Đảm bảo luôn trả về một object hợp lệ
          return {
            ...club, // Giữ nguyên TẤT CẢ dữ liệu gốc
            priorityRoomNames: [], // Default
            leaderCount: 0 // Default
          };
        }
      });
      
      // Dùng Promise.allSettled để không bị fail toàn bộ nếu 1 club lỗi
      const clubsWithDetailsResults = await Promise.allSettled(clubsWithDetailsPromises);
      const clubsWithDetails = clubsWithDetailsResults
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            // Chỉ filter null thực sự (không filter falsy values như 0, false, empty string)
            if (result.value === null || result.value === undefined) {
              console.warn('[ClubManagement.loadData] Club at index', index, 'returned null/undefined, using original club data');
              // Nếu club bị null, vẫn trả về club gốc với default values
              const originalClub = clubsData?.[index];
              if (originalClub) {
                return {
                  ...originalClub,
                  priorityRoomNames: [],
                  leaderCount: 0
                };
              }
              return null;
            }
            return result.value;
          } else {
            console.error('[ClubManagement.loadData] Club at index', index, 'failed:', result.reason);
            // Fallback: trả về club gốc với default values
            const originalClub = clubsData?.[index];
            if (originalClub) {
              return {
                ...originalClub,
                priorityRoomNames: [],
                leaderCount: 0
              };
            }
            return null;
          }
        })
        .filter(club => club !== null && club !== undefined); // CHỈ filter null/undefined thực sự, KHÔNG filter falsy values

      console.log('[ClubManagement.loadData] Clubs with details:', clubsWithDetails);
      console.log('[ClubManagement.loadData] Total clubs from API:', clubsData?.length || 0);
      console.log('[ClubManagement.loadData] Total clubs after processing:', clubsWithDetails.length);
      console.log('[ClubManagement.loadData] Clubs list:', clubsWithDetails.map(c => ({ id: c?.id, name: c?.name })));
      
      // CẢNH BÁO nếu số lượng clubs bị giảm
      if (clubsWithDetails.length < (clubsData?.length || 0)) {
        console.warn('[ClubManagement.loadData] ⚠️ WARNING: Some clubs were lost during processing!', {
          originalCount: clubsData?.length || 0,
          processedCount: clubsWithDetails.length,
          lost: (clubsData?.length || 0) - clubsWithDetails.length
        });
      }

      setClubs(clubsWithDetails);
      setRooms(roomsData || []);
      
      // Nếu đang xem chi tiết một club, cập nhật lại viewingClub
      if (viewingClub) {
        const updatedClub = clubsData?.find(c => c.id === viewingClub.id);
        if (updatedClub) {
          setViewingClub(updatedClub);
        }
      }
    } catch (error) {
      console.error("[ClubManagement.loadData] Lỗi tải dữ liệu:", error);
      // Set empty arrays để tránh crash
      setClubs([]);
      setRooms([]);
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

  const handleEdit = async (club) => {
    setEditingClub(club);
    
    // Load priority rooms của club
    let priorityRoomIds = [];
    try {
      const priorities = await api.getClubPriorityRooms(club.id);
      console.log('[handleEdit] Loaded priorities for club', club.id, ':', priorities);
      // Lấy ID từ priorities - có thể là p.id hoặc p.facilityId
      priorityRoomIds = priorities.map(p => {
        const id = p.facilityId || p.id;
        console.log('[handleEdit] Priority room ID:', id, 'from priority:', p);
        return id;
      }).filter(Boolean);
      console.log('[handleEdit] Priority room IDs:', priorityRoomIds);
    } catch (error) {
      console.error('[handleEdit] Error loading priority rooms:', error);
      // Fallback về priorityRoomIds từ club object nếu có
      priorityRoomIds = club.priorityRoomIds || [];
    }
    
    setFormData({
      name: club.name,
      description: club.description || "",
      priorityRoomIds: priorityRoomIds,
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

  const handleViewDetail = (club) => {
    setViewingClub(club);
    setShowDetailModal(true);
  };

  const handleManageLeaders = (club) => {
    setSelectedClub(club);
    setShowLeaderModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert user.campus sang campusId
      let campusId = null;
      if (typeof user?.campus === 'number') {
        campusId = user.campus;
      } else if (typeof user?.campus === 'string') {
        const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
        campusId = campusMap[user.campus.toLowerCase()] || null;
      } else if (user?.campusId) {
        campusId = user.campusId;
      }

      if (!campusId) {
        alert("Không thể xác định campus. Vui lòng thử lại.");
        return;
      }

      // Tạo payload với campusId
      const payload = {
        name: formData.name,
        description: formData.description || "",
        campusId: campusId,
        // priorityRoomIds sẽ được xử lý riêng sau khi tạo club
      };

      console.log('[handleSubmit] Payload:', payload);

      if (editingClub) {
        await api.updateClub(editingClub.id, payload);
        
        // Cập nhật priority rooms cho club đã tồn tại
        try {
          // Lấy danh sách priority rooms hiện tại
          const currentPriorities = await api.getClubPriorityRooms(editingClub.id);
          console.log('[handleSubmit] Current priorities from API:', currentPriorities);
          
          // Lấy facilityId từ priorities - ưu tiên p.facilityId, sau đó p.id
          const currentPriorityIds = currentPriorities
            .map(p => {
              const id = p.facilityId || p.id;
              // Convert sang number để so sánh
              return typeof id === 'string' ? parseInt(id, 10) : id;
            })
            .filter(id => id !== null && id !== undefined && !isNaN(id));
          
          // Normalize formData.priorityRoomIds
          const newPriorityIds = (formData.priorityRoomIds || [])
            .map(id => typeof id === 'string' ? parseInt(id, 10) : id)
            .filter(id => id !== null && id !== undefined && !isNaN(id));
          
          console.log('[handleSubmit] Current priority IDs (normalized):', currentPriorityIds);
          console.log('[handleSubmit] New priority IDs (normalized):', newPriorityIds);
          
          // Thêm các priority rooms mới
          for (const roomId of newPriorityIds) {
            if (!currentPriorityIds.includes(roomId)) {
              console.log('[handleSubmit] Adding priority room:', roomId);
              await addClubPriority(editingClub.id, { facilityId: roomId });
            }
          }
          
          // Xóa các priority rooms không còn trong danh sách
          for (const currentId of currentPriorityIds) {
            if (!newPriorityIds.includes(currentId)) {
              console.log('[handleSubmit] Removing priority room:', currentId);
              await removeClubPriority(editingClub.id, currentId);
            }
          }
          
          console.log('[handleSubmit] Priority rooms update completed');
        } catch (error) {
          console.error('[handleSubmit] Error updating priority rooms:', error);
          alert("Cập nhật CLB thành công nhưng có lỗi khi cập nhật phòng ưu tiên. Vui lòng thử lại.");
        }
        
        alert("Cập nhật CLB thành công!");
      } else {
        const newClub = await api.createClub(payload);
        
        // Thêm priority rooms sau khi tạo club
        if (formData.priorityRoomIds && formData.priorityRoomIds.length > 0 && newClub?.id) {
          try {
            for (const roomId of formData.priorityRoomIds) {
              await addClubPriority(newClub.id, { facilityId: roomId });
            }
          } catch (error) {
            console.error('[handleSubmit] Error adding priority rooms:', error);
            // Không throw error, chỉ log để không block việc tạo club
          }
        }
        
        alert("Tạo CLB thành công!");
      }
      
      setShowModal(false);
      // Reset form data
      setFormData({
        name: "",
        description: "",
        priorityRoomIds: [],
      });
      setEditingClub(null);
      // Reload data với delay nhỏ để đảm bảo backend đã xử lý xong
      setTimeout(async () => {
        await loadData();
      }, 500);
    } catch (error) {
      console.error('[handleSubmit] Error:', error);
      alert(editingClub ? `Lỗi khi cập nhật CLB: ${error.message}` : `Lỗi khi tạo CLB: ${error.message}`);
    }
  };

  const togglePriorityRoom = (roomId) => {
    setFormData((prev) => {
      const newPriorityRoomIds = prev.priorityRoomIds.includes(roomId)
        ? prev.priorityRoomIds.filter((id) => id !== roomId)
        : [...prev.priorityRoomIds, roomId];
      console.log('[togglePriorityRoom] roomId:', roomId, 'newPriorityRoomIds:', newPriorityRoomIds);
      return {
        ...prev,
        priorityRoomIds: newPriorityRoomIds,
      };
    });
  };

  const filteredClubs = clubs.filter((club) =>
    club.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Log để debug
  console.log('[ClubManagement] Total clubs in state:', clubs.length);
  console.log('[ClubManagement] Filtered clubs:', filteredClubs.length);
  console.log('[ClubManagement] Search term:', searchTerm);

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
          <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col">
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

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
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
                        onClick={(e) => {
                          // Prevent double toggle khi click vào label
                          if (e.target.type !== 'checkbox') {
                            e.preventDefault();
                            togglePriorityRoom(room.id);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.priorityRoomIds.includes(room.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            togglePriorityRoom(room.id);
                          }}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                        />
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 flex-1">{room.name}</span>
                        <span className="text-xs text-gray-400">({room.type})</span>
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
                    <label className="text-sm font-medium text-gray-500">Leader</label>
                    {viewingClub.leader ? (
                      <div className="mt-1">
                        <p className="text-gray-900 font-medium">{viewingClub.leader.name}</p>
                        <p className="text-sm text-gray-500">{viewingClub.leader.email}</p>
                      </div>
                    ) : (
                      <p className="text-gray-400 italic mt-1">Chưa có leader</p>
                    )}
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

