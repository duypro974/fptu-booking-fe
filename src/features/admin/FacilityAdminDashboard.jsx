/* eslint-disable no-unused-vars */
import { Package, Building, Users, CalendarCheck } from "lucide-react";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";

export default function FacilityAdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan Quản lý Phòng</h1>
          <p className="text-gray-500">Quản lý phòng, thiết bị và CLB tại {user?.campusName}.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng số phòng" value="24" icon={Building} color="bg-blue-500" />
        <StatCard title="Thiết bị" value="45" icon={Package} color="bg-orange-500" />
        <StatCard title="Câu lạc bộ" value="12" icon={Users} color="bg-green-500" />
        <StatCard title="Booking hôm nay" value="18" icon={CalendarCheck} color="bg-purple-500" />
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a 
            href="/admin-facility/resources" 
            className="p-4 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-200 transition-colors cursor-pointer"
          >
            <Package className="w-6 h-6 text-orange-600 mb-2" />
            <h3 className="font-semibold text-gray-900">Quản lý Tài nguyên</h3>
            <p className="text-sm text-gray-500 mt-1">Phòng, Thiết bị, CLB</p>
          </a>
          <a 
            href="/admin-facility/approvals" 
            className="p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
          >
            <CalendarCheck className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-gray-900">Duyệt yêu cầu</h3>
            <p className="text-sm text-gray-500 mt-1">Xem và duyệt booking</p>
          </a>
        </div>
      </Card>
    </div>
  );
}

// Component nhỏ
function StatCard({ title, value, icon: Icon, color }) {
    return (
        <Card className="flex items-center gap-4">
            <div className={`p-4 rounded-xl shadow-lg shadow-gray-200 text-white ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            </div>
        </Card>
    )
}

