import { useEffect, useState } from "react";
import { History, Search, Filter, Building2, Package, Users, Eye, Calendar } from "lucide-react";
import { getAllHistory } from "../../services/adminService";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function HistoryLog() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, room, equipment, club
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    // Lấy campusId từ user object (có thể là user.campusId hoặc user.campus)
    const campusId = user?.campusId || user?.campus;
    if (!campusId) {
      console.warn('[HistoryLog] No campusId found in user object:', user);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('[HistoryLog] Loading history with campusId:', campusId);
      const data = await getAllHistory(campusId);
      console.log('[HistoryLog] Received history data:', data?.length || 0, 'items');
      setHistory(data || []);
    } catch (error) {
      console.error("Lỗi tải lịch sử:", error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (log) => {
    if (log === null) {
      setSelectedLog(null);
      setShowDetailModal(false);
    } else {
      setSelectedLog(log);
      setShowDetailModal(true);
    }
  };

  const filteredHistory = history.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityName && log.entityName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === "all" || log.entityType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getEntityIcon = (type) => {
    switch (type) {
      case "room":
        return <Building2 className="w-4 h-4" />;
      case "equipment":
        return <Package className="w-4 h-4" />;
      case "club":
        return <Users className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getEntityTypeLabel = (type) => {
    switch (type) {
      case "room":
        return "Phòng";
      case "equipment":
        return "Thiết bị";
      case "club":
        return "CLB";
      case "booking":
        return "Đơn đặt phòng";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử thay đổi</h1>
          <p className="text-gray-500">Xem lịch sử thay đổi phòng, thiết bị và CLB tại {user?.campusName}.</p>
        </div>
        <Badge type="info" className="text-base px-4 py-2">
          {filteredHistory.length} bản ghi
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm theo hành động, tên entity, người thực hiện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="room">Phòng</option>
              <option value="equipment">Thiết bị</option>
              <option value="club">CLB</option>
              <option value="booking">Đơn đặt phòng</option>
            </select>
          </div>
        </div>
      </Card>

      {/* History List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Đang tải lịch sử...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <Card className="text-center py-12">
          <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">Không tìm thấy lịch sử nào.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((log, idx) => (
            <div key={idx} className="space-y-0">
              <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewDetail(log.id === selectedLog?.id ? null : log)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getEntityIcon(log.entityType)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{log.action}</h3>
                        {log.entityType && (
                          <Badge type="info" className="text-xs">
                            {getEntityTypeLabel(log.entityType)}
                          </Badge>
                        )}
                      </div>
                      
                      {log.entityName && (
                        <p className="text-sm text-gray-700 mb-1">
                          <span className="font-medium">{log.entityName}</span>
                        </p>
                      )}
                      
                      {log.changes && (
                        <p className="text-sm text-gray-600 mb-2">{log.changes}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {log.userName && (
                          <span>Bởi: <span className="font-medium">{log.userName}</span></span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {log.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* View Detail Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetail(log.id === selectedLog?.id ? null : log);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {selectedLog?.id === log.id ? 'Ẩn chi tiết' : 'Chi tiết'}
                  </Button>
                </div>
              </Card>
              
              {/* Inline Detail Panel */}
              {selectedLog?.id === log.id && (
                <Card className="mt-0 border-t-0 rounded-t-none p-6 bg-gray-50">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        {getEntityIcon(selectedLog.entityType)}
                        Chi tiết đơn đặt phòng
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedLog(null);
                          setShowDetailModal(false);
                        }}
                        className="text-gray-400 hover:text-gray-600 text-xl"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Hành động</label>
                        <p className="text-gray-900 font-semibold text-lg mt-1">{selectedLog.action}</p>
                      </div>

                      {selectedLog.entityType && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Loại</label>
                          <div className="mt-1">
                            <Badge type="info">{getEntityTypeLabel(selectedLog.entityType)}</Badge>
                          </div>
                        </div>
                      )}

                      {/* Thông tin Booking chi tiết */}
                      {selectedLog.entityType === 'booking' && selectedLog.facility && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Mã đơn đặt phòng</label>
                            <p className="text-gray-900 font-medium mt-1">#{selectedLog.id}</p>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                            <div className="mt-1">
                              <Badge 
                                type={
                                  selectedLog.status === 'APPROVED' ? 'success' :
                                  selectedLog.status === 'REJECTED' ? 'danger' :
                                  selectedLog.status === 'CANCELLED' ? 'warning' :
                                  selectedLog.status === 'COMPLETED' ? 'success' :
                                  'info'
                                }
                              >
                                {selectedLog.status}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-500">Phòng</label>
                            <p className="text-gray-900 font-medium mt-1">{selectedLog.facility?.name || selectedLog.entityName}</p>
                            {selectedLog.facility?.capacity && (
                              <p className="text-sm text-gray-500 mt-1">Sức chứa: {selectedLog.facility.capacity} người</p>
                            )}
                            {selectedLog.facility?.type?.name && (
                              <p className="text-sm text-gray-500">Loại phòng: {selectedLog.facility.type.name}</p>
                            )}
                          </div>

                          {selectedLog.startTime && selectedLog.endTime && (
                            <>
                              <div>
                                <label className="text-sm font-medium text-gray-500">Thời gian bắt đầu</label>
                                <p className="text-gray-900 font-medium mt-1 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(selectedLog.startTime).toLocaleString('vi-VN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-gray-500">Thời gian kết thúc</label>
                                <p className="text-gray-900 font-medium mt-1 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(selectedLog.endTime).toLocaleString('vi-VN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </>
                          )}

                          {selectedLog.attendeeCount !== undefined && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Số người tham gia</label>
                              <p className="text-gray-900 font-medium mt-1">{selectedLog.attendeeCount} người</p>
                            </div>
                          )}

                          {selectedLog.bookingType && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Loại đặt phòng</label>
                              <p className="text-gray-900 font-medium mt-1">{selectedLog.bookingType.name}</p>
                              {selectedLog.bookingType.description && (
                                <p className="text-sm text-gray-500 mt-1">{selectedLog.bookingType.description}</p>
                              )}
                            </div>
                          )}

                          {selectedLog.isCheckedIn !== undefined && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Trạng thái check-in</label>
                              <div className="mt-1">
                                <Badge type={selectedLog.isCheckedIn ? 'success' : 'warning'}>
                                  {selectedLog.isCheckedIn ? 'Đã check-in' : 'Chưa check-in'}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {selectedLog.changes && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Chi tiết thay đổi</label>
                          <div className="mt-1 p-3 bg-white border border-gray-200 rounded-lg">
                            <p className="text-gray-900">{selectedLog.changes}</p>
                          </div>
                        </div>
                      )}

                      {selectedLog.user && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Người đặt</label>
                          <p className="text-gray-900 font-medium mt-1">{selectedLog.user.fullName || selectedLog.userName}</p>
                          {selectedLog.user.email && (
                            <p className="text-sm text-gray-500 mt-1">{selectedLog.user.email}</p>
                          )}
                          {selectedLog.user.role && (
                            <p className="text-sm text-gray-500">Vai trò: {selectedLog.user.role}</p>
                          )}
                        </div>
                      )}

                      {!selectedLog.user && selectedLog.userName && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Người thực hiện</label>
                          <p className="text-gray-900 font-medium mt-1">{selectedLog.userName}</p>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-gray-500">Thời gian tạo</label>
                        <p className="text-gray-900 font-medium mt-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {selectedLog.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

