import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { History, Search, Filter, Building2, Package, Users, Eye, Calendar, Check, X, AlertCircle, Download } from "lucide-react";
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
  const [dateFilter, setDateFilter] = useState(""); // Date filter: empty, "today", "week", "month", or specific date
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

  const handleCloseDetail = () => {
    setSelectedLog(null);
    setShowDetailModal(false);
  };

  // Helper to extract date string from log (normalize to DD/MM/YYYY format)
  const getLogDate = (log) => {
    let dateStr = null;
    
    // Try to extract from timestamp (could be "19/12/2025, 09:33" or "09:33 19/12/2025")
    if (log.timestamp) {
      const timestamp = log.timestamp.trim();
      // Try comma-separated format first: "19/12/2025, 09:33"
      if (timestamp.includes(',')) {
        dateStr = timestamp.split(',')[0].trim();
      } else {
        // Try space-separated format: "09:33 19/12/2025"
        const parts = timestamp.split(' ');
        // Look for date pattern (DD/MM/YYYY)
        const datePart = parts.find(part => /\d{2}\/\d{2}\/\d{4}/.test(part));
        if (datePart) {
          dateStr = datePart;
        }
      }
    }
    
    // Fallback to startTime
    if (!dateStr && log.startTime) {
      dateStr = new Date(log.startTime).toLocaleDateString('vi-VN');
    }
    
    // Last fallback: current date
    if (!dateStr) {
      dateStr = new Date().toLocaleDateString('vi-VN');
    }
    
    return dateStr;
  };

  // Helper to normalize date string to Date object for comparison
  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    // Parse DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      return date;
    }
    return null;
  };

  const filteredHistory = history.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityName && log.entityName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === "all" || log.entityType === filterType;
    
    // Date filter logic
    let matchesDate = true;
    if (dateFilter) {
      const logDateStr = getLogDate(log);
      const logDateObj = normalizeDate(logDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateFilter === "today") {
        // Compare dates directly (ignoring time)
        matchesDate = logDateObj && logDateObj.getTime() === today.getTime();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = logDateObj && logDateObj >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = logDateObj && logDateObj >= monthAgo;
      } else {
        // Specific date (YYYY-MM-DD format from input)
        const selectedDate = new Date(dateFilter);
        selectedDate.setHours(0, 0, 0, 0);
        matchesDate = logDateObj && logDateObj.getTime() === selectedDate.getTime();
      }
    }
    
    return matchesSearch && matchesFilter && matchesDate;
  });

  // Group history by date (DD/MM/YYYY)
  const groupedHistory = useMemo(() => {
    const groups = {};
    filteredHistory.forEach((log) => {
      // Extract date from timestamp
      const dateStr = log.timestamp ? log.timestamp.split(',')[0] : new Date(log.startTime || Date.now()).toLocaleDateString('vi-VN');
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(log);
    });
    return groups;
  }, [filteredHistory]);

  // Format date label (Hôm nay, Hôm qua, hoặc date)
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return dateStr;
    const today = new Date().toLocaleDateString('vi-VN');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('vi-VN');
    
    if (dateStr === today) {
      return `Hôm nay (${dateStr})`;
    } else if (dateStr === yesterday) {
      return `Hôm qua (${dateStr})`;
    }
    return dateStr;
  };

  // Get icon based on status for bookings, or entity type for others
  const getEntityIcon = (type, status) => {
    const statusUpper = String(status || "").toUpperCase();
    
    // For booking entity type, show status-specific icons
    if (type === "booking") {
      if (statusUpper === "REJECTED" || statusUpper === "CANCELLED" || statusUpper === "CANCELED") {
        return <X className="w-4 h-4" />;
      } else if (statusUpper === "APPROVED") {
        return <Check className="w-4 h-4" />;
      } else if (statusUpper === "PENDING") {
        return <AlertCircle className="w-4 h-4" />;
      }
    }
    
    // Default icons for other entity types
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

  // Get icon background and text color based on status
  const getStatusIconStyle = (status, entityType) => {
    const statusUpper = String(status || "").toUpperCase();
    
    // For booking entity type, show status-specific colors
    if (entityType === "booking") {
      if (statusUpper === "REJECTED" || statusUpper === "CANCELLED" || statusUpper === "CANCELED") {
        return {
          bg: "bg-red-50",
          text: "text-red-600"
        };
      } else if (statusUpper === "APPROVED") {
        return {
          bg: "bg-green-50",
          text: "text-green-600"
        };
      } else if (statusUpper === "PENDING") {
        return {
          bg: "bg-yellow-50",
          text: "text-yellow-600"
        };
      }
    }
    
    // Default: blue/gray for other types
    return {
      bg: "bg-blue-50",
      text: "text-blue-600"
    };
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Implement export Excel functionality
              alert("Chức năng xuất Excel đang được phát triển");
            }}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </Button>
          <Badge type="info" className="text-base px-4 py-2">
            {filteredHistory.length} bản ghi
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col gap-4">
          {/* First Row: Search and Type Filter */}
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
          
          {/* Second Row: Date Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Lọc theo ngày:</span>
            <select
              value={dateFilter && ["today", "week", "month"].includes(dateFilter) ? dateFilter : ""}
              onChange={(e) => {
                setDateFilter(e.target.value || "");
              }}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">Tất cả ngày</option>
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày qua</option>
              <option value="month">30 ngày qua</option>
            </select>
            <span className="text-sm text-gray-500">hoặc</span>
            <input
              type="date"
              value={dateFilter && !["today", "week", "month"].includes(dateFilter) ? dateFilter : ""}
              onChange={(e) => {
                if (e.target.value) {
                  setDateFilter(e.target.value);
                } else {
                  setDateFilter("");
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="px-3 py-2 text-sm text-orange-600 hover:text-orange-800 hover:underline"
              >
                Xóa bộ lọc ngày
              </button>
            )}
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
        <div className="space-y-4">
          {Object.entries(groupedHistory)
            .sort(([dateA], [dateB]) => {
              // Sort dates descending (newest first)
              const dateAObj = new Date(dateA.split('/').reverse().join('-'));
              const dateBObj = new Date(dateB.split('/').reverse().join('-'));
              return dateBObj - dateAObj;
            })
            .map(([dateStr, logs]) => (
              <div key={dateStr} className="space-y-3">
                {/* Date Header */}
                <div className="sticky top-0 z-10 bg-white border-b-2 border-orange-200 pb-2 mb-3">
                  <h2 className="text-lg font-bold text-gray-900">{formatDateLabel(dateStr)}</h2>
                </div>
                
                {/* Logs for this date */}
                {logs.map((log, idx) => (
                  <div key={`${dateStr}-${idx}`} className="space-y-0">
              <Card className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon with status-based coloring */}
                    {(() => {
                      const iconStyle = getStatusIconStyle(log.status, log.entityType);
                      return (
                        <div className={`p-2 ${iconStyle.bg} rounded-lg`}>
                          <div className={iconStyle.text}>
                            {getEntityIcon(log.entityType, log.status)}
                          </div>
                        </div>
                      );
                    })()}
                    
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
                          <span className="font-bold text-orange-600">{log.entityName}</span>
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
                    onClick={() => handleViewDetail(log)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Chi tiết
                  </Button>
                </div>
              </Card>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLog && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={handleCloseDetail}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10 animate-zoom-in">
            <Card className="rounded-2xl border-0 shadow-none">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {(() => {
                      const iconStyle = getStatusIconStyle(selectedLog.status, selectedLog.entityType);
                      return (
                        <div className={iconStyle.text}>
                          {getEntityIcon(selectedLog.entityType, selectedLog.status)}
                        </div>
                      );
                    })()}
                    Chi tiết đơn đặt phòng
                  </h3>
                  <button
                    onClick={handleCloseDetail}
                    className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                  >
                    ×
                  </button>
                </div>

                {/* Content */}
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

                  {selectedLog.purpose && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mục đích sử dụng</label>
                      <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-gray-900">{selectedLog.purpose}</p>
                      </div>
                    </div>
                  )}

                  {selectedLog.changes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Chi tiết thay đổi</label>
                      <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
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

                {/* Footer */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleCloseDetail}
                    className="w-full"
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

