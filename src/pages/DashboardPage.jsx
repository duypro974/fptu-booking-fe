/* eslint-disable no-unused-vars */
import { Calendar, Clock, Bell, ArrowRight, Zap, MapPin, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function DashboardPage() {
  const { user } = useAuth();

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          icon={Calendar} 
          color="blue" 
          label="Lịch đặt sắp tới" 
          value="02" 
          desc="Booking đang chờ bạn" 
        />
        <StatsCard 
          icon={Clock} 
          color="orange" 
          label="Giờ sử dụng (T12)" 
          value="12.5h" 
          desc="Tăng 20% so với tháng trước" 
          trend="up"
        />
        <StatsCard 
          icon={Bell} 
          color="purple" 
          label="Thông báo mới" 
          value="05" 
          desc="2 tin quan trọng từ Campus" 
        />
      </div>

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
            {/* Booking Item 1 */}
            <div className="group bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex items-center gap-5">
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-orange-50 rounded-lg text-orange-600">
                <span className="text-xs font-bold uppercase">Thg 12</span>
                <span className="text-2xl font-bold">09</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-orange-600 transition-colors">Phòng Seminar 201</h3>
                    <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4" /> 09:30 - 11:45 (Slot 2)
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold border border-green-200">
                    Đã duyệt
                  </span>
                </div>
              </div>
              <Link to="/history" className="p-2 text-gray-300 group-hover:text-orange-600 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Booking Item 2 */}
            <div className="group bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex items-center gap-5 opacity-80">
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-gray-50 rounded-lg text-gray-500">
                <span className="text-xs font-bold uppercase">Thg 12</span>
                <span className="text-2xl font-bold">09</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-700 text-lg">Sân Bóng Đá 1</h3>
                    <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4" /> 15:00 - 17:15 (Slot 4)
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold border border-yellow-200">
                    Chờ duyệt
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Sidebar Right: News (Chiếm 1/3) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            Tin tức Campus
          </h2>
          <Card noPadding className="divide-y divide-gray-100 overflow-hidden">
            <div className="p-4 hover:bg-gray-50 transition cursor-pointer">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-red-500 flex-shrink-0"></div>
                <div>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">QUAN TRỌNG</span>
                  <p className="text-sm font-semibold text-gray-900 mt-2 leading-snug">Bảo trì hệ thống điện tòa Alpha vào ngày mai.</p>
                  <p className="text-xs text-gray-400 mt-1">2 giờ trước</p>
                </div>
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50 transition cursor-pointer">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                <div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">SỰ KIỆN</span>
                  <p className="text-sm font-semibold text-gray-900 mt-2 leading-snug">Mở đăng ký vé F-Camp 2025 cho K19.</p>
                  <p className="text-xs text-gray-400 mt-1">5 giờ trước</p>
                </div>
              </div>
            </div>
             <div className="p-4 hover:bg-gray-50 transition cursor-pointer">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-gray-300 flex-shrink-0"></div>
                <div>
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">THÔNG BÁO</span>
                  <p className="text-sm font-semibold text-gray-900 mt-2 leading-snug">Cập nhật quy định mượn phòng Lab.</p>
                  <p className="text-xs text-gray-400 mt-1">1 ngày trước</p>
                </div>
              </div>
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