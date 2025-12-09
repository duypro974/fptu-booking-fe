/* eslint-disable no-unused-vars */
import { Users, Building, CalendarCheck, TrendingUp, MapPin } from "lucide-react";
import Card from "../../components/ui/Card";

export default function FacilityDashboard() {
  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h1>
          <p className="text-gray-500">Thống kê hoạt động toàn bộ 5 cơ sở FPT University.</p>
        </div>
        <div className="flex gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-2">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Hệ thống Online
            </span>
        </div>
      </div>

      {/* Stats Cards Tổng */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng người dùng" value="12,450" icon={Users} color="bg-blue-500" />
        <StatCard title="Phòng hoạt động" value="485" icon={Building} color="bg-orange-500" />
        <StatCard title="Booking hôm nay" value="1,203" icon={CalendarCheck} color="bg-green-500" />
        <StatCard title="Tỉ lệ lấp đầy" value="85%" icon={TrendingUp} color="bg-purple-500" />
      </div>

      {/* Trạng thái các Campus */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-6">Trạng thái các Campus</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <CampusStatus name="Hồ Chí Minh" status="active" bookings={450} />
            <CampusStatus name="Hòa Lạc" status="active" bookings={380} />
            <CampusStatus name="Đà Nẵng" status="warning" bookings={120} note="Bảo trì Server" />
            <CampusStatus name="Cần Thơ" status="active" bookings={150} />
            <CampusStatus name="Quy Nhơn" status="active" bookings={90} />
        </div>
      </div>

      {/* Biểu đồ giả lập (CSS Only) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="min-h-[300px]">
            <h3 className="font-bold text-gray-800 mb-6">Lượt đặt phòng theo giờ (Realtime)</h3>
            <div className="flex items-end justify-between h-48 gap-2">
                {[40, 65, 30, 80, 55, 90, 45, 70, 35, 60, 85, 50].map((h, i) => (
                    <div key={i} className="w-full bg-orange-100 rounded-t-md relative group">
                        <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-orange-500 rounded-t-md transition-all duration-500 group-hover:bg-orange-600"></div>
                        <div className="absolute -bottom-6 left-0 w-full text-center text-xs text-gray-400">{i+7}h</div>
                    </div>
                ))}
            </div>
        </Card>
        
        <Card>
            <h3 className="font-bold text-gray-800 mb-4">Hoạt động gần đây</h3>
            <div className="space-y-4">
                {[1,2,3,4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">SV</div>
                            <div>
                                <p className="text-sm font-medium">Nguyễn Văn A vừa đặt phòng tại <span className="font-bold text-orange-600">HCM</span></p>
                                <p className="text-xs text-gray-400">2 phút trước</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
      </div>
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

function CampusStatus({ name, status, bookings, note }) {
    return (
        <div className={`p-4 rounded-xl border-2 ${status === 'active' ? 'border-green-100 bg-green-50/50' : 'border-yellow-100 bg-yellow-50/50'}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-800 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {name}
                </span>
                <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{bookings}</p>
            <p className="text-xs text-gray-500">Lượt đặt hôm nay</p>
            {note && <p className="text-xs text-yellow-700 mt-2 font-medium bg-yellow-100 px-2 py-1 rounded inline-block">{note}</p>}
        </div>
    )
}