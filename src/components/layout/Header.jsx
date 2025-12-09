import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, User, LogOut, ChevronDown, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    // THAY ĐỔI LỚN: Nền Gradient Cam -> Đỏ, Text màu trắng
    <header className="h-16 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar} 
          className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link to="/" className="flex items-center gap-3">
          {/* Logo đảo màu: Nền trắng, Chữ cam */}
          <div className="bg-white p-1.5 rounded-lg shadow-lg">
            <span className="text-orange-600 font-extrabold text-xl leading-none">F</span>
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block text-white">FPTU Booking</span>
        </Link>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification Bell (Màu trắng) */}
        <button className="relative p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full border border-orange-600"></span>
        </button>
        
        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l border-white/20 focus:outline-none"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-white leading-none">{user?.name}</p>
              {/* Campus name màu vàng nhạt cho nổi */}
              <p className="text-xs text-orange-100 font-medium mt-1 truncate max-w-[120px]">{user?.campusName}</p>
            </div>
            <div className="relative">
               <img src={user?.avatar} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-white/50 shadow-sm object-cover" />
               <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 text-orange-600 shadow-sm">
                 <ChevronDown className="w-3 h-3" />
               </div>
            </div>
          </button>

          {/* Dropdown Menu (Vẫn giữ nền trắng để dễ đọc) */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 text-gray-900 z-50">
              <div className="px-4 py-3 border-b border-gray-50 md:hidden bg-gray-50">
                <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              
              <div className="px-2 py-2">
                <Link 
                  to="/profile" 
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><User className="w-4 h-4" /></div>
                  Trang cá nhân
                </Link>
                <Link 
                  to="/settings" 
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="p-1.5 bg-gray-100 text-gray-600 rounded-md"><Settings className="w-4 h-4" /></div>
                  Cài đặt
                </Link>
              </div>
              
              <div className="my-1 border-t border-gray-100"></div>
              
              <div className="px-2 pb-1">
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <div className="p-1.5 bg-red-100 text-red-600 rounded-md"><LogOut className="w-4 h-4" /></div>
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}