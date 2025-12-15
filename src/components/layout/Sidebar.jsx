import { Calendar, LayoutDashboard, History, Shield, Globe, CheckSquare, Users, Package } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ isOpen }) {
  const location = useLocation();
  const { user } = useAuth();

  // STUDENT & CLUB LEADER MENU (Club Leader có thêm quyền nhưng menu giống Student)
  const STUDENT_MENU = [
    { icon: LayoutDashboard, label: "Trang chủ", path: "/dashboard" },
    { icon: Calendar, label: "Đặt phòng", path: "/booking" },
    { icon: History, label: "Lịch sử", path: "/history" },
  ];

  const STAFF_MENU = [
    { icon: LayoutDashboard, label: "Tổng quan Cơ sở", path: "/admin-campus" },
    { icon: CheckSquare, label: "Duyệt yêu cầu", path: "/admin-campus/approvals" },
    { icon: Shield, label: "Quản lý Phòng", path: "/admin-campus/rooms" },
  ];

  // FACILITY ADMIN MENU (Nhân viên quản lý phòng)
  const FACILITY_ADMIN_MENU = [
    { icon: CheckSquare, label: "Duyệt yêu cầu", path: "/admin-facility/approvals" },
    { icon: Shield, label: "Quản lý Phòng", path: "/admin-facility/rooms" },
    { icon: Package, label: "Quản lý Thiết bị", path: "/admin-facility/equipment" },
    { icon: Users, label: "Quản lý CLB", path: "/admin-facility/clubs" },
    { icon: History, label: "Lịch sử", path: "/admin-facility/history" },
  ];

  // Xác định menu dựa trên role (hỗ trợ cả lowercase và uppercase)
  const userRole = user?.role?.toLowerCase();
  let menuItems = STUDENT_MENU;
  if (userRole === 'campus_admin') menuItems = STAFF_MENU;
  if (userRole === 'facility_admin') menuItems = FACILITY_ADMIN_MENU;
  
  // Debug logging
  if (user) {
    console.log('[Sidebar] User:', user);
    console.log('[Sidebar] User role (raw):', user?.role);
    console.log('[Sidebar] User role (normalized):', userRole);
    console.log('[Sidebar] Selected menu items:', menuItems.length, menuItems.map(m => m.label));
  }

  return (
    <aside className={cn(
      "fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 transition-transform duration-300 z-20",
      // Logic: Nếu isOpen = false thì ẩn sang trái (-translate-x-full)
      !isOpen && "-translate-x-full"
    )}>
      <div className="flex flex-col h-full py-6 px-3">
        
        {/* Label Menu */}
        <div className="px-4 mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menu Chính</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-orange-50 text-orange-700" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600")} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        {/* Phần dưới cùng có thể để thông tin version hoặc hình trang trí */}
        <div className="mt-auto px-4">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
                <p className="text-xs text-orange-800 font-semibold">FPTU Booking v1.0</p>
                <p className="text-[10px] text-orange-600/70 mt-1">Hỗ trợ: swp391@fpt.edu.vn</p>
            </div>
        </div>
      </div>
    </aside>
  );
}