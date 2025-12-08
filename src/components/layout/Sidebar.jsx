// src/components/layout/Sidebar.jsx
import { Calendar, LayoutDashboard, History, Shield, LogOut, Globe, CheckSquare, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ isOpen }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  // 1. Menu Sinh viên
  const STUDENT_MENU = [
    { icon: LayoutDashboard, label: "Trang chủ", path: "/dashboard" },
    { icon: Calendar, label: "Đặt phòng", path: "/booking" },
    { icon: History, label: "Lịch sử", path: "/history" },
  ];

  // 2. Menu Staff (Campus Admin)
  const STAFF_MENU = [
    { icon: LayoutDashboard, label: "Tổng quan Cơ sở", path: "/admin-campus" },
    { icon: CheckSquare, label: "Duyệt yêu cầu", path: "/admin-campus/approvals" },
    { icon: Shield, label: "Quản lý Phòng", path: "/admin-campus/rooms" },
  ];

  // 3. Menu Admin Tổng (Facility Admin)
  const FACILITY_ADMIN_MENU = [
    { icon: Globe, label: "Toàn hệ thống", path: "/admin-facility" },
    { icon: Users, label: "Quản lý Tài khoản", path: "/admin-facility/users" },
    { icon: Shield, label: "Cấu hình chung", path: "/admin-facility/settings" },
  ];

  // Chọn Menu dựa trên Role
  let menuItems = STUDENT_MENU;
  if (user?.role === 'campus_admin') menuItems = STAFF_MENU;
  if (user?.role === 'facility_admin') menuItems = FACILITY_ADMIN_MENU;

  return (
    <aside className={cn(
      "fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-100 shadow-xl lg:shadow-none transition-transform z-40 lg:translate-x-0",
      !isOpen && "-translate-x-full"
    )}>
      <div className="flex flex-col h-full p-4">
        {/* User Card */}
        <div className="bg-orange-50 p-4 rounded-xl mb-6 flex items-center gap-3">
          <img src={user?.avatar} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white" />
          <div className="overflow-hidden">
            <p className="font-bold text-gray-900 truncate text-sm">{user?.name}</p>
            <p className="text-xs text-orange-600 font-bold uppercase truncate">
              {user?.role === 'student' ? user?.campusName : 
               user?.role === 'campus_admin' ? `Admin ${user?.campusName}` : 'Quản trị viên'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  isActive ? "bg-orange-600 text-white shadow-md" : "text-gray-600 hover:bg-orange-50 hover:text-orange-700"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-gray-400 group-hover:text-orange-600")} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        {/* Logout */}
        <div className="pt-4 border-t mt-auto">
          <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium">
            <LogOut className="w-5 h-5" /> Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}