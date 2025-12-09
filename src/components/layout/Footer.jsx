import { Link } from "react-router-dom";
import { Facebook, Youtube, Globe, Mail, Phone, MapPin, Heart, Send, ArrowRight } from "lucide-react";
import Button from "../ui/Button";

export default function Footer() {
  return (
    <footer className="mt-auto z-10 relative">
      
      {/* 1. SECTION NỔI BẬT: Newsletter (Gradient Cam) */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 relative overflow-hidden">
        {/* Họa tiết trang trí mờ */}
        <div className="absolute top-0 right-0 p-10 opacity-10 transform translate-x-10 -translate-y-10">
          <Globe className="w-64 h-64 text-white" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Đừng bỏ lỡ thông báo quan trọng!</h2>
            <p className="text-orange-100">Đăng ký để nhận tin tức về sự kiện, lịch bảo trì và ưu đãi từ FPTU.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-xl flex w-full md:w-auto border border-white/20">
            <input 
              type="email" 
              placeholder="Nhập email sinh viên..." 
              className="bg-transparent border-none text-white placeholder-orange-200 px-4 py-2 outline-none w-full md:w-72 focus:ring-0"
            />
            <Button className="bg-white text-orange-600 hover:bg-orange-50 shadow-none border-none font-bold">
              Đăng ký
            </Button>
          </div>
        </div>
      </div>

      {/* 2. MAIN FOOTER (Dark Theme - Sang trọng) */}
      <div className="bg-gray-900 text-gray-400 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            
            {/* Brand */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg">
                  <span className="text-white font-bold text-xl leading-none">F</span>
                </div>
                <span className="font-bold text-2xl text-white tracking-tight">FPTU Booking</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-400">
                Nền tảng đặt phòng thông minh, kết nối không gian học tập hiện đại cho sinh viên và giảng viên FPT University toàn quốc.
              </p>
              <div className="flex gap-4">
                {[Facebook, Youtube, Globe].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all duration-300 hover:-translate-y-1">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                Khám phá
              </h3>
              <ul className="space-y-4">
                {['Trang chủ', 'Đặt phòng ngay', 'Lịch sử', 'Điều khoản'].map((item, i) => (
                  <li key={i}>
                    <a href="#" className="flex items-center gap-2 hover:text-orange-500 transition-colors group">
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact HCM */}
            <div>
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                 <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                 TP. Hồ Chí Minh
              </h3>
              <ul className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
                  <span>Lô E2a-7, Đường D1, Khu CNC, TP.Thủ Đức, TP.HCM</span>
                </li>
                <li className="flex gap-3">
                  <Phone className="w-5 h-5 text-orange-500 shrink-0" />
                  <span className="hover:text-white cursor-pointer">(028) 7300 5588</span>
                </li>
                <li className="flex gap-3">
                  <Mail className="w-5 h-5 text-orange-500 shrink-0" />
                  <span className="hover:text-white cursor-pointer">daihoc.hcm@fpt.edu.vn</span>
                </li>
              </ul>
            </div>

            {/* Contact HN */}
            <div>
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                 <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                 Hà Nội
              </h3>
              <ul className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
                  <span>Khu CNC Hòa Lạc, Km29 Đại lộ Thăng Long, Hà Nội</span>
                </li>
                <li className="flex gap-3">
                  <Phone className="w-5 h-5 text-orange-300 shrink-0" />
                  <span className="hover:text-white cursor-pointer">(024) 7300 1866</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 bg-black/40">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>© 2025 FPT University. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-red-200 fill-red-600 animate-pulse" /> by <span className="text-white font-medium">SWP391 Group</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}