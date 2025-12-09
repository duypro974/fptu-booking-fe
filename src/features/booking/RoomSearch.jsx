import { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // <--- IMPORT QUAN TRỌNG
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { MapPin, Users, Search, Wifi, Projector, Wind, X, CalendarCheck, Info } from "lucide-react";

export default function RoomSearch() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    if (user?.campus) {
      api.getRooms(user.campus).then(data => {
        setRooms(data);
        setLoading(false);
      });
    }
  }, [user]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      
      {/* 1. Header Tìm kiếm */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đặt phòng tại {user?.campusName}</h1>
          <p className="text-gray-500 mt-1">Tìm kiếm và đặt chỗ nhanh chóng cho việc học tập & rèn luyện.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
            placeholder="Tìm tên phòng (VD: Seminar, Sân bóng...)" 
          />
        </div>
      </div>

      {/* 2. Grid Danh sách phòng */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Đang tải dữ liệu phòng...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.length > 0 ? rooms.map((room) => (
            <Card 
              key={room.id} 
              className="group hover:-translate-y-1 transition-all duration-300 p-0 overflow-hidden cursor-pointer border-gray-200 hover:border-orange-200 hover:shadow-lg" 
              onClick={() => setSelectedRoom(room)} // Bấm vào để mở Modal
            >
              {/* Ảnh phòng */}
              <div className="h-56 overflow-hidden relative">
                <img src={room.image} alt={room.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                
                {/* Lớp phủ đen mờ khi hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="bg-white/20 backdrop-blur-md text-white border border-white/50 px-4 py-2 rounded-full font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    Xem chi tiết
                  </span>
                </div>
                
                <div className="absolute top-3 right-3">
                  <Badge type={room.status === 'available' ? 'success' : 'danger'} className="shadow-sm backdrop-blur-md bg-white/90">
                    {room.status === 'available' ? 'Trống' : 'Bận'}
                  </Badge>
                </div>
              </div>

              {/* Thông tin ngắn gọn */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{room.name}</h3>
                <div className="flex items-center text-sm text-gray-500 gap-4 mb-4">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {user.campusName}</span>
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-400" /> {room.capacity} chỗ</span>
                </div>
                {/* Nút giả (để trang trí) */}
                <Button 
                  className="w-full bg-gray-50 text-gray-700 hover:bg-orange-600 hover:text-white border-none shadow-none group-hover:shadow-md transition-all"
                >
                  {room.status === 'available' ? 'Chọn phòng này' : 'Xem lịch'}
                </Button>
              </div>
            </Card>
          )) : (
            <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">Không tìm thấy phòng nào phù hợp.</p>
            </div>
          )}
        </div>
      )}

      {/* --- RENDER MODAL QUA PORTAL --- */}
      {selectedRoom && (
        <RoomDetailModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
      )}
    </div>
  );
}

// --- COMPONENT MODAL (Sử dụng React Portal) ---
function RoomDetailModal({ room, onClose }) {
  const amenities = [
    { icon: Wifi, label: "Wifi tốc độ cao" },
    { icon: Projector, label: "Máy chiếu HDMI" },
    { icon: Wind, label: "Điều hòa" },
    { icon: Info, label: "Bảng trắng" },
  ];

  // createPortal: Đưa modal ra khỏi DOM hiện tại, gắn thẳng vào body
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      
      {/* 1. Backdrop (Lớp nền đen mờ) */}
      <div 
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose} // Bấm ra ngoài để đóng
      ></div>

      {/* 2. Modal Content (Nổi lên trên) */}
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-zoom-in"
        onClick={(e) => e.stopPropagation()} // Chặn click xuyên
      >
        
        {/* Header: Ảnh Cover */}
        <div className="h-52 relative shrink-0">
          <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-all border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-6 text-white">
            <h2 className="text-3xl font-bold text-shadow-sm">{room.name}</h2>
            <p className="flex items-center gap-2 text-gray-200 text-sm mt-1">
              <MapPin className="w-4 h-4 text-orange-400" /> 
              {room.campus === 'hcm' ? 'TP.Hồ Chí Minh' : 'Hòa Lạc'} • Tòa Alpha
            </p>
          </div>
        </div>

        {/* Body: Nội dung cuộn được */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
          
          {/* Thông số chính */}
          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-600 shadow-sm"><Users className="w-5 h-5"/></div>
                <div>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Sức chứa</p>
                   <p className="font-bold text-gray-900 text-lg">{room.capacity} Người</p>
                </div>
             </div>
             <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm"><Search className="w-5 h-5"/></div>
                <div>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Loại phòng</p>
                   <p className="font-bold text-gray-900 text-lg">{room.type}</p>
                </div>
             </div>
          </div>

          {/* Tiện ích */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
              Tiện ích có sẵn
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {amenities.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors">
                  <item.icon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
              Lưu ý sử dụng
            </h3>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800 leading-relaxed">
              Vui lòng tắt hết thiết bị điện (máy lạnh, đèn, máy chiếu) và đóng cửa cẩn thận sau khi sử dụng xong. 
              Giữ vệ sinh chung cho người sử dụng sau.
            </div>
          </div>
        </div>

        {/* Footer: Nút hành động (Ghim dưới đáy modal) */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose} className="hover:bg-gray-200 text-gray-600">Đóng lại</Button>
          <Button 
            disabled={room.status !== 'available'} 
            className="px-8 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-200 border-none"
          >
            <CalendarCheck className="w-4 h-4 mr-2" />
            {room.status === 'available' ? 'Xác nhận Đặt phòng' : 'Phòng đang bận'}
          </Button>
        </div>

      </div>
    </div>,
    document.body // <-- ĐÂY LÀ CHÌA KHÓA: Render thẳng vào body
  );
}