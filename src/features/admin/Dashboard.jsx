import Card from "../../components/ui/Card";
import { BarChart, CheckCircle, Clock, AlertTriangle } from "lucide-react";

const STATS = [
  { label: "Đơn chờ duyệt", val: "12", icon: Clock, color: "text-orange-600", bg: "bg-orange-100" },
  { label: "Đã duyệt hôm nay", val: "45", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  { label: "Báo cáo sự cố", val: "3", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Tổng quan hệ thống</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATS.map((stat, idx) => (
          <Card key={idx} className="p-6 flex items-center gap-4">
            <div className={`p-4 rounded-full ${stat.bg}`}>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">{stat.label}</p>
              <h4 className="text-3xl font-bold">{stat.val}</h4>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-64 flex items-center justify-center bg-gray-50 border-dashed">
          <span className="text-gray-400">Biểu đồ thống kê đặt phòng (Chart Placeholder)</span>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold mb-4">Yêu cầu mới nhất</h3>
          <ul className="space-y-3">
            {[1,2,3].map(i => (
              <li key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">CLB Cờ Vua - Phòng 201</span>
                <span className="text-sm text-orange-600">Chờ duyệt</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}