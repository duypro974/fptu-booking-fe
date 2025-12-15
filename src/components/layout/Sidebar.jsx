import {
  Calendar,
  LayoutDashboard,
  History,
  CheckSquare,
  Package,
  BarChart3,
  Clock,
  Sparkles,
  Home, // ✅ thêm icon cho “Danh sách phòng”
} from "lucide-react";
import { Calendar, LayoutDashboard, History, Shield, Globe, CheckSquare, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ isOpen }) {
  const location = useLocation();
  const { user } = useAuth();

  const role = user?.role; // IN HOA: STUDENT | LECTURER | FACILITY_ADMIN | SECURITY | CLUB_LEADER (nếu có)

  // ✅ Routes mới (thêm /booking/facilities)
  const STUDENT_LECTURER_MENU = [
  // STUDENT & CLUB LEADER MENU (Club Leader có thêm quyền nhưng menu giống Student)
  const STUDENT_MENU = [
    { icon: LayoutDashboard, label: "Trang chủ", path: "/dashboard" },
    { icon: Home, label: "Danh sách phòng", path: "/booking/facilities" }, // ✅ NEW
    { icon: Calendar, label: "Tìm phòng", path: "/booking/search" },
    { icon: History, label: "Đơn của tôi", path: "/booking/my" },
  ];

  const CLUB_LEADER_EXTRA = [
    { icon: Sparkles, label: "Gợi ý ưu tiên CLB", path: "/booking/club-suggestions" },
  ];

  const STAFF_MENU = [
    { icon: LayoutDashboard, label: "Tổng quan Cơ sở", path: "/admin-campus" },
    { icon: CheckSquare, label: "Duyệt yêu cầu", path: "/admin-campus/approvals" },
    { icon: Shield, label: "Quản lý Phòng", path: "/admin-campus/rooms" },
  ];

  const SECURITY_MENU = [
    { icon: CheckSquare, label: "Check-in/Out", path: "/security/checkin" },
    { icon: Calendar, label: "Lịch hôm nay", path: "/security/schedule" },
  ];

  let menuItems = STUDENT_LECTURER_MENU;

  if (role === "FACILITY_ADMIN") {
    menuItems = FACILITY_ADMIN_MENU;
  } else if (role === "SECURITY") {
    menuItems = SECURITY_MENU;
  } else if (role === "CLUB_LEADER") {
    menuItems = [...STUDENT_LECTURER_MENU, ...CLUB_LEADER_EXTRA];
  } else {
    menuItems = STUDENT_LECTURER_MENU;
  }
  // FACILITY ADMIN MENU (Nhân viên quản lý phòng)
  const FACILITY_ADMIN_MENU = [
    { icon: Globe, label: "Toàn hệ thống", path: "/admin-facility" },
    { icon: Users, label: "Quản lý Tài khoản", path: "/admin-facility/users" },
  ];

  // Xác định menu dựa trên role
  let menuItems = STUDENT_MENU;
  if (user?.role === 'campus_admin') menuItems = STAFF_MENU;
  if (user?.role === 'facility_admin') menuItems = FACILITY_ADMIN_MENU;

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
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menu Chính</span>
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
                  isActive ? "bg-orange-50 text-orange-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
