// src/features/booking/RoomSearch.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext"; 
import { api } from "../../services/api";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { MapPin, Users, Search } from "lucide-react";

export default function RoomSearch() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.campus) {
      // Gọi API, truyền campusId của user vào
      api.getRooms(user.campus).then(data => {
        setRooms(data);
        setLoading(false);
      });
    }
  }, [user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Đặt phòng tại {user?.campusName}</h1>
        <p className="text-gray-300 opacity-90">Tìm kiếm và đặt chỗ nhanh chóng cho việc học tập & rèn luyện.</p>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-4 bg-white p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input className="w-full pl-10 pr-4 py-2.5 outline-none text-gray-700" placeholder="Tìm tên phòng (VD: Seminar, Sân bóng...)" />
        </div>
        <Button className="rounded-lg px-6">Tìm kiếm</Button>
      </div>

      {/* Grid Rooms */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Đang tải dữ liệu phòng...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.length > 0 ? rooms.map((room) => (
            <Card key={room.id} className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="h-48 overflow-hidden relative">
                <img src={room.image} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 right-3">
                  <Badge type={room.status === 'available' ? 'success' : 'danger'} className="shadow-sm">
                    {room.status === 'available' ? 'Trống' : 'Bận'}
                  </Badge>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">{room.name}</h3>
                <div className="flex items-center text-sm text-gray-500 gap-4 mt-2 mb-5">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {user.campusName}</span>
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {room.capacity} chỗ</span>
                </div>
                <Button className="w-full font-semibold" disabled={room.status !== 'available'}>
                  {room.status === 'available' ? 'Đặt ngay' : 'Không khả dụng'}
                </Button>
              </div>
            </Card>
          )) : (
            <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border border-dashed">
              <p className="text-gray-500">Không tìm thấy phòng nào tại cơ sở này.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}