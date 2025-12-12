import { useEffect, useState } from "react";
import { TrendingUp, Calendar, Building, Users, BarChart3, Clock, History } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";

export default function Statistics() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("week"); // week, month, year

  useEffect(() => {
    loadStatistics();
  }, [user, dateRange]);

  const loadStatistics = async () => {
    if (!user?.campus) return;
    setLoading(true);
    try {
      const [statsData, historyData] = await Promise.all([
        api.getStatistics(user.campus, dateRange),
        api.getAllHistory(user.campus)
      ]);
      setStats(statsData);
      setHistory(historyData);
    } catch (error) {
      console.error("Lỗi tải thống kê:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thống kê & Báo cáo</h1>
          <p className="text-gray-500">Thống kê hoạt động đặt phòng tại {user?.campusName}.</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        >
          <option value="week">7 ngày qua</option>
          <option value="month">30 ngày qua</option>
          <option value="year">Năm nay</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Đang tải thống kê...</p>
        </div>
      ) : stats ? (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Tổng booking"
              value={stats.totalBookings}
              change={stats.bookingChange}
              icon={Calendar}
              color="bg-blue-500"
            />
            <StatCard
              title="Tỷ lệ lấp đầy"
              value={`${stats.occupancyRate}%`}
              change={stats.occupancyChange}
              icon={TrendingUp}
              color="bg-green-500"
            />
            <StatCard
              title="Phòng hoạt động"
              value={stats.activeRooms}
              icon={Building}
              color="bg-orange-500"
            />
            <StatCard
              title="Tỷ lệ hủy"
              value={`${stats.cancellationRate}%`}
              change={stats.cancellationChange}
              icon={Clock}
              color="bg-red-500"
            />
          </div>

          {/* Top Rooms */}
          <Card>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Top phòng được đặt nhiều nhất</h2>
            <div className="space-y-3">
              {stats.topRooms && stats.topRooms.length > 0 ? (
                stats.topRooms.map((room, index) => (
                  <div key={room.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{room.name}</p>
                        <p className="text-xs text-gray-500">{room.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{room.bookingCount} lượt</p>
                      <p className="text-xs text-gray-500">{room.occupancyRate}% lấp đầy</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-gray-500">Chưa có dữ liệu</p>
              )}
            </div>
          </Card>

          {/* Booking Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Phân bổ trạng thái booking</h2>
              <div className="space-y-3">
                <StatusBar label="Đã duyệt" value={stats.statusDistribution?.approved || 0} total={stats.totalBookings} color="bg-green-500" />
                <StatusBar label="Chờ duyệt" value={stats.statusDistribution?.pending || 0} total={stats.totalBookings} color="bg-yellow-500" />
                <StatusBar label="Từ chối" value={stats.statusDistribution?.rejected || 0} total={stats.totalBookings} color="bg-red-500" />
                <StatusBar label="Đã hủy" value={stats.statusDistribution?.cancelled || 0} total={stats.totalBookings} color="bg-gray-500" />
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Booking theo loại phòng</h2>
              <div className="space-y-3">
                {stats.bookingByType && Object.entries(stats.bookingByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-gray-700">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${(count / stats.totalBookings) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* History Log */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-800">Lịch sử thay đổi gần đây</h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history && history.length > 0 ? (
                history.map((log, idx) => (
                  <div key={idx} className="border-l-2 border-gray-200 pl-4 pb-4 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          {log.entityType && (
                            <Badge type="info" className="text-xs">
                              {log.entityType === "room" ? "Phòng" :
                               log.entityType === "equipment" ? "Thiết bị" :
                               log.entityType === "club" ? "CLB" : log.entityType}
                            </Badge>
                          )}
                        </div>
                        {log.entityName && (
                          <p className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">{log.entityName}</span>
                          </p>
                        )}
                        {log.changes && (
                          <p className="text-xs text-gray-600 mt-1">{log.changes}</p>
                        )}
                        {log.userName && (
                          <p className="text-xs text-gray-500 mt-1">Bởi: {log.userName}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{log.timestamp}</span>
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
          </Card>
        </>
      ) : (
        <Card className="text-center py-12">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Không có dữ liệu thống kê</p>
        </Card>
      )}
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, color }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className={`w-4 h-4 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              <span className="text-xs text-gray-500">so với kỳ trước</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl ${color} text-white`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

function StatusBar({ label, value, total, color }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-900">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

