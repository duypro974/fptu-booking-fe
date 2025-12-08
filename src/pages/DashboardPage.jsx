// src/pages/DashboardPage.jsx
import { Calendar, Clock, Bell, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Chào mừng, <span className="font-bold text-orange-600">{user?.name}</span>
          </p>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Đang truy cập: {user?.campusName}
          </div>
        </div>
        <Link to="/booking">
          <Button className="shadow-md shadow-orange-200">+ Đặt phòng mới</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-blue-50 border-blue-100 hover:shadow-md transition">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white text-blue-600 rounded-xl shadow-sm"><Calendar className="w-6 h-6"/></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Lịch đặt sắp tới</p>
              <h3 className="text-2xl font-bold text-gray-900">2</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-orange-50 border-orange-100 hover:shadow-md transition">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white text-orange-600 rounded-xl shadow-sm"><Clock className="w-6 h-6"/></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Giờ sử dụng (Tháng 12)</p>
              <h3 className="text-2xl font-bold text-gray-900">12h</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-purple-50 border-purple-100 hover:shadow-md transition">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white text-purple-600 rounded-xl shadow-sm"><Bell className="w-6 h-6"/></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Thông báo mới</p>
              <h3 className="text-2xl font-bold text-gray-900">5</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Lịch trình hôm nay</h2>
          
          <Card className="p-5 border-l-4 border-l-orange-500 flex justify-between items-center bg-white shadow-sm hover:shadow-md transition">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Phòng Seminar 201</h3>
              <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" /> 09:30 - 11:45 (Slot 2)
              </p>
              <span className="inline-block mt-2 px-2.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium border border-green-200">Đã duyệt</span>
            </div>
            <Link to="/history" className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition"><ArrowRight className="w-5 h-5"/></Link>
          </Card>
          
           <Card className="p-5 border-l-4 border-l-gray-300 flex justify-between items-center bg-gray-50 opacity-80">
            <div>
              <h3 className="font-bold text-lg text-gray-700">Sân Bóng Đá 1</h3>
              <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" /> 15:00 - 17:15 (Slot 4)
              </p>
              <span className="inline-block mt-2 px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium border border-yellow-200">Chờ duyệt</span>
            </div>
            <Link to="/history" className="p-2 text-gray-400 hover:text-orange-600 transition"><ArrowRight className="w-5 h-5"/></Link>
          </Card>
        </div>

        {/* Notifications */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Tin tức Campus</h2>
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b hover:bg-gray-50 transition cursor-pointer">
              <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">QUAN TRỌNG</span>
              <p className="text-sm font-medium mt-2 text-gray-800">Thông báo bảo trì hệ thống điện tòa Alpha.</p>
              <p className="text-xs text-gray-400 mt-1">2 giờ trước</p>
            </div>
            <div className="p-4 hover:bg-gray-50 transition cursor-pointer">
              <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">SỰ KIỆN</span>
              <p className="text-sm font-medium mt-2 text-gray-800">Mở đăng ký vé F-Camp 2025 cho K19.</p>
              <p className="text-xs text-gray-400 mt-1">5 giờ trước</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}