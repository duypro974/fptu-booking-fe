/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Bell, ArrowRight, Zap, MapPin, Activity, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { getMyBookings } from "../services/bookingService";

// Helper để format slot từ startTime và endTime
const getSlotLabelFromTimes = (startTime, endTime) => {
  if (!startTime || !endTime) return "—";

  const start = new Date(startTime);
  const end = new Date(endTime);

  const startH = start.getHours();
  const startM = start.getMinutes();
  const endH = end.getHours();
  const endM = end.getMinutes();

  const SLOT_RANGES = [
    { id: 1, startH: 7, startM: 0, endH: 9, endM: 0 },
    { id: 2, startH: 9, startM: 0, endH: 11, endM: 0 },
    { id: 3, startH: 11, startM: 0, endH: 13, endM: 0 },
    { id: 4, startH: 13, startM: 0, endH: 15, endM: 0 },
    { id: 5, startH: 15, startM: 0, endH: 17, endM: 0 },
  ];

  const findSlotByTime = (h, m, type) => {
    return SLOT_RANGES.find(s => {
      if (type === 'start') return s.startH === h && s.startM === m;
      if (type === 'end') return s.endH === h && s.endM === m;
      return false;
    }) || null;
  };

  const startSlot = findSlotByTime(startH, startM, 'start');
  const endSlot = findSlotByTime(endH, endM, 'end');

  const formatH = (d) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const sStr = formatH(start);
  const eStr = formatH(end);

  if (startSlot && endSlot && startSlot.id === endSlot.id) {
    return `Slot ${startSlot.id} (${sStr} - ${eStr})`;
  }

  if (startSlot && endSlot && startSlot.id < endSlot.id) {
    const ids = [];
    for (let i = startSlot.id; i <= endSlot.id; i++) ids.push(i);
    return `Slot ${ids.join(', ')} (${sStr} - ${eStr})`;
  }

  // Fallback to simple range
  return `${sStr} - ${eStr}`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getMyBookings();
        const list = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
        setBookings(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('[DashboardPage] fetchBookings error:', e);
        setBookings([]);
        setError(e?.message || "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBookings();
    }
  }, [user]);

  // Tính toán stats từ bookings thật
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Lịch đặt sắp tới (APPROVED hoặc PENDING, chưa qua)
    const upcomingBookings = bookings.filter(booking => {
      const startTime = booking?.startTime || 
                       (booking?.isGroup && booking?.bookings?.[0]?.startTime) ||
                       booking?.date || 
                       booking?.bookingDate;
      if (!startTime) return false;
      const start = new Date(startTime);
      return start >= today && (booking?.status === "APPROVED" || booking?.status === "PENDING");
    });

    // Tính tổng giờ sử dụng trong tháng này (chỉ APPROVED)
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let totalHours = 0;
    
    bookings.forEach(booking => {
      if (booking?.status !== "APPROVED") return;
      
      const startTime = booking?.startTime || 
                       (booking?.isGroup && booking?.bookings?.[0]?.startTime);
      const endTime = booking?.endTime || 
                     (booking?.isGroup && booking?.bookings?.[0]?.endTime);
      
      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (start.getMonth() === currentMonth && start.getFullYear() === currentYear) {
          const hours = (end - start) / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
    });

    return {
      upcomingCount: upcomingBookings.length,
      totalHours: totalHours.toFixed(1),
      notificationsCount: 0 // Chưa có API notifications
    };
  }, [bookings]);

  // Lấy bookings hôm nay và sắp tới
  const todayBookings = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return bookings
      .filter(booking => {
        const startTime = booking?.startTime || 
                         (booking?.isGroup && booking?.bookings?.[0]?.startTime) ||
                         booking?.date || 
                         booking?.bookingDate;
        if (!startTime) return false;
        const start = new Date(startTime);
        return start >= today && start < tomorrow;
      })
      .sort((a, b) => {
        const aTime = new Date(a?.startTime || (a?.isGroup && a?.bookings?.[0]?.startTime) || a?.date || 0);
        const bTime = new Date(b?.startTime || (b?.isGroup && b?.bookings?.[0]?.startTime) || b?.date || 0);
        return aTime - bTime;
      })
      .slice(0, 5); // Chỉ lấy 5 booking đầu tiên
  }, [bookings]);

  const formatCreatedAt = (dateString) => {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    } catch (e) {
      return "-";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      
      {/* 1. Hero Banner: Gradient Cam FPT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-xl shadow-orange-200">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-white/10">
              <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
              <span>Hệ thống hoạt động bình thường</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Xin chào, {user?.name}! 👋</h1>
            <p className="text-orange-50 opacity-90 text-lg max-w-xl">
              Bạn đang truy cập hệ thống tại <b>{user?.campusName}</b>. Hôm nay bạn cần đặt phòng nào?
            </p>
          </div>
          <Link to="/booking">
            <Button className="bg-white text-orange-600 hover:bg-gray-50 border-none shadow-lg px-8 py-4 rounded-xl font-bold text-base transition-transform hover:scale-105">
              + Đặt phòng mới
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Quick Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className=""> 
          <Card className="p-6 text-center bg-red-50 border-red-100">
            <p className="text-red-700 font-medium">Lỗi khi tải dữ liệu: {error}</p>
            <div className="mt-4">
              <Button onClick={() => {
                // retry
                setLoading(true);
                setError("");
                // call effect by toggling user (simple approach: re-run fetchBookings by triggering useEffect)
                // Better: call getMyBookings directly here
                (async () => {
                  try {
                    const data = await getMyBookings();
                    const list = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
                    setBookings(Array.isArray(list) ? list : []);
                  } catch (e) {
                    console.error('[DashboardPage] retry error:', e);
                    setError(e?.message || 'Không thể tải dữ liệu');
                  } finally {
                    setLoading(false);
                  }
                })();
              }}>
                Thử lại
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard 
            icon={Calendar} 
            color="blue" 
            label="Lịch đặt sắp tới" 
            value={stats.upcomingCount.toString().padStart(2, '0')} 
            desc="Booking đang chờ bạn" 
          />
          <StatsCard 
            icon={Clock} 
            color="orange" 
            label={`Giờ sử dụng (T${new Date().getMonth() + 1})`}
            value={`${stats.totalHours}h`} 
            desc="Tổng giờ đã sử dụng tháng này" 
          />
          <StatsCard 
            icon={Bell} 
            color="purple" 
            label="Thông báo mới" 
            value={stats.notificationsCount.toString().padStart(2, '0')} 
            desc="Tin tức từ Campus" 
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 3. Main Content: Lịch trình (Chiếm 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              Lịch trình hôm nay
            </h2>
            <Link to="/history" className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline">
              Xem tất cả
            </Link>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                <span className="ml-2 text-gray-600">Đang tải lịch trình...</span>
              </div>
            ) : todayBookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Không có lịch đặt phòng hôm nay</p>
                <Link to="/booking">
                  <Button className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">
                    + Đặt phòng ngay
                  </Button>
                </Link>
              </div>
            ) : (
              todayBookings.map((booking) => {
                const startTime = booking?.startTime || 
                                 (booking?.isGroup && booking?.bookings?.[0]?.startTime) ||
                                 booking?.date || 
                                 booking?.bookingDate;
                const endTime = booking?.endTime || 
                               (booking?.isGroup && booking?.bookings?.[0]?.endTime);
                
                const start = startTime ? new Date(startTime) : null;
                const facilityName = booking?.facilityName || 
                                   booking?.facility?.name || 
                                   booking?.roomName || 
                                   "—";
                
                const status = booking?.status?.toUpperCase();
                const statusConfig = {
                  APPROVED: { label: "Đã duyệt", bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
                  PENDING: { label: "Chờ duyệt", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
                  REJECTED: { label: "Bị từ chối", bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
                  CANCELLED: { label: "Đã hủy", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" }
                };
                const statusInfo = statusConfig[status] || statusConfig.PENDING;

                const formatTime = (date) => {
                  if (!date) return "—";
                  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                };

                const formatDate = (date) => {
                  if (!date) return { month: "—", day: "—" };
                  const months = ["Thg 1", "Thg 2", "Thg 3", "Thg 4", "Thg 5", "Thg 6", "Thg 7", "Thg 8", "Thg 9", "Thg 10", "Thg 11", "Thg 12"];
                  return {
                    month: months[date.getMonth()],
                    day: date.getDate().toString()
                  };
                };

                const dateInfo = start ? formatDate(start) : { month: "—", day: "—" };
                const timeRange = start && endTime 
                  ? getSlotLabelFromTimes(startTime, endTime)
                  : start 
                    ? formatTime(start)
                    : "—";

                return (
                  <div 
                    key={booking?.id} 
                    className={`group bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex items-center gap-5 ${
                      status === "CANCELLED" || status === "REJECTED" ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-orange-50 rounded-lg text-orange-600">
                      <span className="text-xs font-bold uppercase">{dateInfo.month}</span>
                      <span className="text-2xl font-bold">{dateInfo.day}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-orange-600 transition-colors">
                            {facilityName}
                          </h3>
                          <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4" /> {timeRange}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Đặt: {formatCreatedAt(booking?.createdAt)}</p>
                        </div>
                        <span className={`px-3 py-1 ${statusInfo.bg} ${statusInfo.text} text-xs rounded-full font-bold border ${statusInfo.border}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    <Link to="/history" className="p-2 text-gray-300 group-hover:text-orange-600 transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 4. Sidebar Right: News (Chiếm 1/3) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            Tin tức Campus
          </h2>
          <Card noPadding className="divide-y divide-gray-100 overflow-hidden">
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Chưa có thông báo mới</p>
              <p className="text-xs text-gray-400 mt-1">Thông báo từ Campus sẽ hiển thị tại đây</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Sub-component nhỏ để code đỡ rối
function StatsCard({ icon: Icon, color, label, value, desc, trend }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <Card className="hover:-translate-y-1 transition-transform duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend === 'up' && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+20%</span>}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-gray-500 font-medium text-sm">{label}</p>
      <p className="text-xs text-gray-400 mt-2">{desc}</p>
    </Card>
  );
}