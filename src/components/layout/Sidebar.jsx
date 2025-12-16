import {
  Calendar,
  LayoutDashboard,
  History,
  Shield,
  Globe,
  CheckSquare,
  Users,
  Package,
  Sparkles,
  Home,
  Repeat,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ isOpen }) {
  const location = useLocation();
  const { user } = useAuth();

  // normalize role: hỗ trợ cả "FACILITY_ADMIN" và "facility_admin"
  const userRole = (user?.role || "").toLowerCase();

  // ===== MENUS =====
  const STUDENT_LECTURER_MENU = [
    { icon: LayoutDashboard, label: "Trang chủ", path: "/dashboard" },
    { icon: Home, label: "Danh sách phòng", path: "/facilities" },
    { icon: Calendar, label: "Đặt phòng", path: "/booking" },
    { icon: History, label: "Lịch sử", path: "/history" },
  ];

  const CLUB_LEADER_EXTRA = [
    { icon: Sparkles, label: "Gợi ý ưu tiên CLB", path: "/booking/club-suggestions" },
  ];

  const LECTURER_EXTRA = [
    { icon: Repeat, label: "Đặt phòng định kỳ", path: "/booking/recurring" },
  ];

  const CAMPUS_ADMIN_MENU = [
    { icon: LayoutDashboard, label: "Tổng quan Cơ sở", path: "/admin-campus" },
    { icon: CheckSquare, label: "Duyệt yêu cầu", path: "/admin-campus/approvals" },
    { icon: Shield, label: "Quản lý Phòng", path: "/admin-campus/rooms" },
    { icon: Home, label: "Danh sách phòng", path: "/facilities" },
  ];

  const FACILITY_ADMIN_MENU = [
    { icon: Globe, label: "Toàn hệ thống", path: "/admin-facility" },
    { icon: CheckSquare, label: "Duyệt yêu cầu", path: "/admin-facility/approvals" },
    { icon: Shield, label: "Quản lý Phòng", path: "/admin-facility/rooms" },
    { icon: Package, label: "Quản lý Thiết bị", path: "/admin-facility/equipment" },
    { icon: Users, label: "Quản lý CLB", path: "/admin-facility/clubs" },
    { icon: History, label: "Lịch sử", path: "/admin-facility/history" },
  ];

  const SECURITY_MENU = [
    { icon: CheckSquare, label: "Check-in/Out", path: "/security/checkin" },
    { icon: Calendar, label: "Lịch hôm nay", path: "/security/schedule" },
  ];

  const SYSTEM_ADMIN_MENU = [
    { icon: Globe, label: "Toàn hệ thống", path: "/admin" },
    { icon: Users, label: "Quản lý Tài khoản", path: "/admin/users" },
  ];

  // ===== CHOOSE MENU =====
  let menuItems = STUDENT_LECTURER_MENU;

  if (userRole === "facility_admin") {
    menuItems = FACILITY_ADMIN_MENU;
  } else if (userRole === "security" || userRole === "security_guard") {
    menuItems = SECURITY_MENU;
  } else if (userRole === "campus_admin") {
    menuItems = CAMPUS_ADMIN_MENU;
  } else if (userRole === "system_admin") {
    menuItems = SYSTEM_ADMIN_MENU;
  } else if (userRole === "club_leader") {
    menuItems = [...STUDENT_LECTURER_MENU, ...CLUB_LEADER_EXTRA];
  } else if (userRole === "lecturer") {
    menuItems = [...STUDENT_LECTURER_MENU, ...LECTURER_EXTRA];
  } else {
    menuItems = STUDENT_LECTURER_MENU;
  }

  const isActivePath = (itemPath) => {
    if (itemPath === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname === itemPath || location.pathname.startsWith(itemPath + "/");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 transition-transform duration-300 z-20",
        !isOpen && "-translate-x-full"
      )}
    >
      <div className="flex flex-col h-full py-6 px-3">
        <div className="px-4 mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Menu Chính
          </span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = isActivePath(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  isActive
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

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
