import { Bell, LogOut, Menu, User } from "lucide-react";
import Button from "../ui/Button";

export default function Header({ toggleSidebar }) {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="lg:hidden p-2 hover:bg-gray-100 rounded-md">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-bold text-xl text-orange-600 hidden sm:block">FPTU Booking</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-full">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium">Nguyễn Văn A</p>
            <p className="text-xs text-gray-500">Sinh viên</p>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-500" />
          </div>
        </div>
      </div>
    </header>
  );
}