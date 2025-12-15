import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import BookingForm from "./BookingForm";
import SuccessDialog from "../../components/ui/SuccessDialog";
import { 
  MapPin, Users, Search, Wifi, Projector, Wind, X, CalendarCheck, Info, 
  Filter, Calendar, Clock, Building2, SlidersHorizontal, ChevronLeft, ChevronRight 
} from "lucide-react";

export default function RoomSearch() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampus, setSelectedCampus] = useState(user?.campus || "hcm");
  const [selectedType, setSelectedType] = useState("");
  const [minCapacity, setMinCapacity] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Schedule view state
  const [scheduleView, setScheduleView] = useState("list"); // "list" | "day" | "week"
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Load facility types
  useEffect(() => {
    api.getFacilityTypes().then(data => {
      setFacilityTypes(data);
    });
  }, []);

  // Load rooms with filters
  useEffect(() => {
    setLoading(true);
    const filters = {
      campusId: selectedCampus,
      facilityTypeId: selectedType || undefined,
      minCapacity: minCapacity ? parseInt(minCapacity) : undefined,
      maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
      searchQuery: searchQuery || undefined,
    };
    
    api.getRooms(filters).then(data => {
      setRooms(data);
      setLoading(false);
    });
  }, [selectedCampus, selectedType, minCapacity, maxCapacity, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedType("");
    setMinCapacity("");
    setMaxCapacity("");
    setSelectedCampus(user?.campus || "hcm");
  };

  const campuses = api.getCampuses();

  const filteredRooms = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return rooms;
    return rooms.filter((r) => (r?.name || "").toLowerCase().includes(k));
  }, [rooms, keyword]);

  const campusLabel = user?.campusName || `Campus #${user?.campusId ?? ""}`;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      
      {/* 1. Header với Search */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Đặt phòng tại {user?.campusName}</h1>
            <p className="text-gray-500 mt-1">Tìm kiếm và đặt chỗ nhanh chóng cho việc học tập & rèn luyện.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
              placeholder="Tìm tên phòng (VD: Seminar, Sân bóng...)" 
            />
          </div>
        </div>

        {/* Filter Toggle & View Mode */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? "Ẩn bộ lọc" : "Hiển thị bộ lọc"}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScheduleView("list")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                scheduleView === "list" 
                  ? "bg-orange-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Danh sách
            </button>
            <button
              onClick={() => setScheduleView("day")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                scheduleView === "day" 
                  ? "bg-orange-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Ngày
            </button>
            <button
              onClick={() => setScheduleView("week")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                scheduleView === "week" 
                  ? "bg-orange-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tuần
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Campus Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cơ sở</label>
              <select 
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Facility Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loại phòng</label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="">Tất cả</option>
                {facilityTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            {/* Min Capacity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sức chứa tối thiểu</label>
              <input
                type="number"
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                placeholder="VD: 10"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* Max Capacity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sức chứa tối đa</label>
              <input
                type="number"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                placeholder="VD: 50"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* Reset Button */}
            <div className="md:col-span-4 flex justify-end">
              <Button 
                variant="secondary" 
                onClick={handleResetFilters}
                className="text-sm"
              >
                Đặt lại bộ lọc
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Schedule View - Day/Week */}
      {scheduleView === "day" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Lịch biểu theo ngày</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() - 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <button
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() + 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Chọn một phòng để xem lịch biểu chi tiết
          </p>
        </div>
      )}

      {scheduleView === "week" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Lịch biểu theo tuần</h2>
          <p className="text-sm text-gray-500">
            Tính năng xem lịch theo tuần sẽ được phát triển trong phiên bản tiếp theo
          </p>
        </div>
      )}

      {/* 3. Grid Danh sách phòng */}
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
              onClick={() => setSelectedRoom(room)}
            >
              {/* Ảnh phòng */}
              <div className="h-56 overflow-hidden relative bg-gradient-to-br from-orange-200 to-red-200">
                <img 
                  src={room.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600"} 
                  alt={room.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  onError={(e) => {
                    // Fallback nếu ảnh lỗi
                    const fallbackUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600";
                    if (e.target.src !== fallbackUrl) {
                      e.target.src = fallbackUrl;
                    }
                  }}
                />
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="bg-white/20 backdrop-blur-md text-white border border-white/50 px-4 py-2 rounded-full font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    Xem chi tiết & Đặt phòng
                  </span>
                </div>
                
                <div className="absolute top-3 right-3">
                  <Badge type="success" className="shadow-sm backdrop-blur-md bg-white/90">
                    Trống
                  </Badge>
                </div>
              </div>

              {/* Thông tin ngắn gọn */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{room.name}</h3>
                <div className="flex items-center text-sm text-gray-500 gap-4 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-gray-400" /> 
                    {room.building || "Tòa Alpha"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-gray-400" /> 
                    {room.capacity} chỗ
                  </span>
                </div>
                <div className="mb-4">
                  <Badge type="info" className="text-xs">
                    {room.type}
                  </Badge>
                </div>
                <Button 
                  className="w-full bg-gray-50 text-gray-700 hover:bg-orange-600 hover:text-white border-none shadow-none group-hover:shadow-md transition-all"
                >
                  Chọn phòng này
                </Button>
              </div>
            </Card>
          )) : (
            <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">Không tìm thấy phòng nào phù hợp.</p>
              <Button variant="secondary" onClick={handleResetFilters} className="mt-4">
                Đặt lại bộ lọc
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal Chi tiết phòng */}
      {selectedRoom && (
        <RoomDetailModal 
          room={selectedRoom} 
          onClose={() => setSelectedRoom(null)}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

// --- COMPONENT MODAL CHI TIẾT PHÒNG ---
function RoomDetailModal({ room, onClose, selectedDate }) {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [facilityDetail, setFacilityDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [successDialog, setSuccessDialog] = useState(null);

  // Load facility detail từ API
  useEffect(() => {
    if (room) {
      setLoadingDetail(true);
      api.getFacilityDetail(room.id)
        .then(detail => {
          console.log('[RoomDetailModal] Facility detail loaded:', detail);
          console.log('[RoomDetailModal] Images:', detail.images);
          setFacilityDetail(detail);
          setLoadingDetail(false);
        })
        .catch(error => {
          console.error('Error loading facility detail:', error);
          setLoadingDetail(false);
        });
    }
  }, [room]);

  useEffect(() => {
    if (room) {
      setLoadingSchedule(true);
      // TODO: Gọi API getRoomSchedule khi có endpoint từ backend
      // Tạm thời tạo mock slots để user có thể chọn
      try {
        // api.getRoomSchedule(room.id, selectedDate || new Date().toISOString().split('T')[0], "day")
        //   .then(data => {
        //     setSchedule(data);
        //     setLoadingSchedule(false);
        //   });
        
        // Mock slots tạm thời để user có thể chọn
        const mockSlots = [
          { id: 1, start: "07:00", end: "08:30", label: "Slot 1" },
          { id: 2, start: "08:30", end: "10:00", label: "Slot 2" },
          { id: 3, start: "10:00", end: "11:30", label: "Slot 3" },
          { id: 4, start: "11:30", end: "13:00", label: "Slot 4" },
          { id: 5, start: "13:00", end: "14:30", label: "Slot 5" },
          { id: 6, start: "14:30", end: "16:00", label: "Slot 6" },
          { id: 7, start: "16:00", end: "17:30", label: "Slot 7" },
          { id: 8, start: "17:30", end: "19:00", label: "Slot 8" },
          { id: 9, start: "19:00", end: "20:30", label: "Slot 9" },
          { id: 10, start: "20:30", end: "22:00", label: "Slot 10" },
        ];
        
        setSchedule({
          facilityId: room.id,
          date: selectedDate || new Date().toISOString().split('T')[0],
          slots: mockSlots,
          bookings: [] // Chưa có booking data từ API
        });
        setLoadingSchedule(false);
      } catch (error) {
        console.error('Error loading schedule:', error);
        setSchedule(null);
        setLoadingSchedule(false);
      }
    }
  }, [room, selectedDate]);

  const handleSlotClick = (slotId) => {
    if (selectedSlots.includes(slotId)) {
      setSelectedSlots(selectedSlots.filter(id => id !== slotId));
    } else {
      // Kiểm tra slot continuity
      if (selectedSlots.length === 0) {
        setSelectedSlots([slotId]);
      } else {
        const sorted = [...selectedSlots, slotId].sort((a, b) => a - b);
        // Kiểm tra tính liên tiếp
        let isContinuous = true;
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] !== sorted[i-1] + 1) {
            isContinuous = false;
            break;
          }
        }
        if (isContinuous) {
          setSelectedSlots(sorted);
        } else {
          alert("Các slot phải liên tiếp nhau! Vui lòng chọn lại.");
        }
      }
    }
  };

  const isSlotBooked = (slotId) => {
    if (!schedule) return false;
    return schedule.bookings.some(booking => 
      booking.slotIds.includes(slotId) && booking.status === "approved"
    );
  };

  const isSlotPending = (slotId) => {
    if (!schedule) return false;
    return schedule.bookings.some(booking => 
      booking.slotIds.includes(slotId) && booking.status === "pending"
    );
  };

  // Sử dụng equipment từ API, fallback về amenities mặc định nếu chưa có
  const equipment = facilityDetail?.equipment || [];
  const displayEquipment = equipment.length > 0 
    ? equipment.map(eq => ({ icon: Info, label: eq }))
    : [
        { icon: Wifi, label: "Wifi tốc độ cao" },
        { icon: Projector, label: "Máy chiếu HDMI" },
        { icon: Wind, label: "Điều hòa" },
        { icon: Info, label: "Bảng trắng" },
      ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      <div 
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>

      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Ảnh Cover */}
        <div className="h-52 relative shrink-0 bg-gradient-to-br from-orange-400 to-red-500">
          {(() => {
            // Ưu tiên: facilityDetail.images[0] > room.image > fallback
            const imageUrl = facilityDetail?.images?.[0] || room.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800";
            console.log('[RoomDetailModal] Using image URL:', imageUrl);
            
            return (
              <img 
                src={imageUrl} 
                alt={room.name} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  console.error('[RoomDetailModal] Image failed to load:', imageUrl);
                  // Fallback nếu ảnh lỗi
                  const fallbackUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800";
                  if (e.target.src !== fallbackUrl) {
                    e.target.src = fallbackUrl;
                  }
                }}
                onLoad={() => {
                  console.log('[RoomDetailModal] Image loaded successfully:', imageUrl);
                }}
              />
            );
          })()}
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
              {room.building || "Tòa Alpha"} • Tầng {room.floor || "1"}
            </p>
          </div>
        </div>

        {/* Body: Nội dung cuộn được */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
          
          {/* Thông số chính */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-600 shadow-sm">
                <Users className="w-5 h-5"/>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Sức chứa</p>
                <p className="font-bold text-gray-900 text-lg">
                  {loadingDetail ? "..." : (facilityDetail?.capacity || room.capacity)} Người
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm">
                <Building2 className="w-5 h-5"/>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Loại phòng</p>
                <p className="font-bold text-gray-900 text-lg">
                  {loadingDetail ? "..." : (facilityDetail?.type || room.type)}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm">
                <MapPin className="w-5 h-5"/>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Cơ sở</p>
                <p className="font-bold text-gray-900 text-lg">
                  {loadingDetail ? "..." : (facilityDetail?.campus?.name || room.building || "N/A")}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-purple-600 shadow-sm">
                <Clock className="w-5 h-5"/>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Trạng thái</p>
                <p className="font-bold text-gray-900 text-lg">
                  {loadingDetail ? "..." : (
                    facilityDetail?.status === "ACTIVE" ? "Hoạt động" : 
                    facilityDetail?.status === "INACTIVE" ? "Ngừng hoạt động" : 
                    "Trống"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Thông tin chi tiết từ API */}
          {!loadingDetail && facilityDetail && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Type Information */}
              {facilityDetail.type && (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    Loại phòng
                  </h4>
                  <p className="text-base font-semibold text-gray-900 mb-1">
                    {typeof facilityDetail.type === 'string' ? facilityDetail.type : facilityDetail.type.name}
                  </p>
                  {facilityDetail.typeId && (
                    <p className="text-xs text-gray-500">ID: {facilityDetail.typeId}</p>
                  )}
                  {facilityDetail.type?.description && (
                    <p className="text-sm text-gray-600 mt-2">{facilityDetail.type.description}</p>
                  )}
                </div>
              )}

              {/* Campus Information */}
              {facilityDetail.campus && (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    Cơ sở
                  </h4>
                  <p className="text-base font-semibold text-gray-900 mb-1">
                    {facilityDetail.campus.name}
                  </p>
                  {facilityDetail.campusId && (
                    <p className="text-xs text-gray-500 mb-2">ID: {facilityDetail.campusId}</p>
                  )}
                  {facilityDetail.campus.address && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {facilityDetail.campus.address}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Lịch biểu phòng */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
              Lịch biểu hôm nay ({selectedDate || new Date().toLocaleDateString('vi-VN')})
            </h3>
            
            {loadingSchedule ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">Đang tải lịch biểu...</p>
              </div>
            ) : schedule ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {schedule.slots.map((slot) => {
                  const isBooked = isSlotBooked(slot.id);
                  const isPending = isSlotPending(slot.id);
                  const isSelected = selectedSlots.includes(slot.id);
                  
                  return (
                    <button
                      key={slot.id}
                      onClick={() => !isBooked && !isPending && handleSlotClick(slot.id)}
                      disabled={isBooked || isPending}
                      className={`
                        p-4 rounded-lg border-2 text-center transition-all
                        ${isBooked 
                          ? "bg-red-50 border-red-200 cursor-not-allowed opacity-60" 
                          : isPending
                          ? "bg-yellow-50 border-yellow-200 cursor-not-allowed"
                          : isSelected
                          ? "bg-orange-500 border-orange-600 text-white"
                          : "bg-gray-50 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                        }
                      `}
                    >
                      <div className="text-xs font-semibold mb-1">{slot.label}</div>
                      <div className="text-xs">{slot.start} - {slot.end}</div>
                      {isBooked && <div className="text-xs mt-1 text-red-600">Đã đặt</div>}
                      {isPending && <div className="text-xs mt-1 text-yellow-600">Chờ duyệt</div>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Không có dữ liệu lịch biểu</p>
            )}

            {selectedSlots.length > 0 && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm font-semibold text-orange-900 mb-2">
                  Đã chọn {selectedSlots.length} slot: {selectedSlots.map(id => `Slot ${id}`).join(", ")}
                </p>
                <Button 
                  onClick={() => setShowBookingForm(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Tiếp tục đặt phòng
                </Button>
              </div>
            )}
          </div>

          {/* Tiện ích / Thiết bị */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
              {equipment.length > 0 ? "Thiết bị có sẵn" : "Thiết bị có sẵn"}
            </h3>
            {loadingDetail ? (
              <div className="text-center py-4">
                <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : equipment.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {equipment.map((eq, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors">
                    <Info className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{eq}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-center">
                <p className="text-sm text-gray-500">Phòng này hiện chưa có thiết bị được liệt kê</p>
              </div>
            )}
          </div>

          {/* Mô tả */}
          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
              Mô tả phòng
            </h3>
            {loadingDetail ? (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-500">
                <div className="animate-pulse">Đang tải mô tả...</div>
              </div>
            ) : facilityDetail?.description ? (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-gray-700 leading-relaxed">
                {facilityDetail.description}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-500 italic">
                Chưa có mô tả cho phòng này
              </div>
            )}
          </div>

          {/* Gallery ảnh */}
          {!loadingDetail && (
            <div className="mt-8">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
                Hình ảnh phòng ({facilityDetail?.images?.length || 0} ảnh)
              </h3>
              {facilityDetail?.images && facilityDetail.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {facilityDetail.images.map((img, idx) => (
                    <div key={idx} className="relative h-32 rounded-lg overflow-hidden border border-gray-200 hover:border-orange-300 transition-colors cursor-pointer group bg-gray-100">
                      <img 
                        src={img} 
                        alt={`${room.name} ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        onError={(e) => {
                          // Fallback nếu ảnh lỗi
                          e.target.src = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=400";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-center">
                  <p className="text-sm text-gray-500">Chưa có hình ảnh cho phòng này</p>
                </div>
              )}
            </div>
          )}

          {/* Thông tin kỹ thuật */}
          {!loadingDetail && facilityDetail && (
            <div className="mt-8 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
                Thông tin kỹ thuật
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {facilityDetail.id && (
                  <div>
                    <span className="text-gray-500">ID Phòng:</span>
                    <span className="ml-2 font-semibold text-gray-900">{facilityDetail.id}</span>
                  </div>
                )}
                {facilityDetail.typeId && (
                  <div>
                    <span className="text-gray-500">ID Loại:</span>
                    <span className="ml-2 font-semibold text-gray-900">{facilityDetail.typeId}</span>
                  </div>
                )}
                {facilityDetail.campusId && (
                  <div>
                    <span className="text-gray-500">ID Cơ sở:</span>
                    <span className="ml-2 font-semibold text-gray-900">{facilityDetail.campusId}</span>
                  </div>
                )}
                {facilityDetail.status && (
                  <div>
                    <span className="text-gray-500">Trạng thái:</span>
                    <span className={`ml-2 font-semibold ${
                      facilityDetail.status === "ACTIVE" ? "text-green-600" : "text-red-600"
                    }`}>
                      {facilityDetail.status}
                    </span>
                  </div>
                )}
                {facilityDetail.type?.isActive !== undefined && (
                  <div>
                    <span className="text-gray-500">Loại hoạt động:</span>
                    <span className={`ml-2 font-semibold ${
                      facilityDetail.type.isActive ? "text-green-600" : "text-red-600"
                    }`}>
                      {facilityDetail.type.isActive ? "Hoạt động" : "Ngừng"}
                    </span>
                  </div>
                )}
                {facilityDetail.campus?.isActive !== undefined && (
                  <div>
                    <span className="text-gray-500">Cơ sở hoạt động:</span>
                    <span className={`ml-2 font-semibold ${
                      facilityDetail.campus.isActive ? "text-green-600" : "text-red-600"
                    }`}>
                      {facilityDetail.campus.isActive ? "Hoạt động" : "Ngừng"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking Form */}
          {showBookingForm && (
            <div 
              className="mt-8 border-t border-gray-200 pt-6"
              ref={(el) => {
                // Auto scroll to form when it appears
                if (el) {
                  setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }
              }}
            >
              <BookingForm
                room={room}
                facilityDetail={facilityDetail}
                selectedSlots={selectedSlots}
                selectedDate={selectedDate}
                onSuccess={(result) => {
                  // Hiển thị success dialog
                  setSuccessDialog({
                    title: "Đặt phòng thành công!",
                    message: result.message || "Yêu cầu đặt phòng đã được gửi thành công",
                    bookingCode: result.bookingCode
                  });
                  // Reset form
                  setShowBookingForm(false);
                  setSelectedSlots([]);
                }}
                onCancel={() => {
                  setShowBookingForm(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Footer: Nút hành động */}
        {!showBookingForm && (
          <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
            <Button variant="secondary" onClick={onClose} className="hover:bg-gray-200 text-gray-600">
              Đóng lại
            </Button>
            {selectedSlots.length > 0 && (
              <Button 
                onClick={() => setShowBookingForm(true)}
                className="px-8 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-200 border-none"
              >
                <CalendarCheck className="w-4 h-4 mr-2" />
                Đặt phòng ({selectedSlots.length} slot)
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Success Dialog */}
      {successDialog && (
        <SuccessDialog
          title={successDialog.title}
          message={successDialog.message}
          bookingCode={successDialog.bookingCode}
          onClose={() => {
            setSuccessDialog(null);
            onClose(); // Đóng modal sau khi đóng dialog
          }}
        />
      )}
    </div>,
    document.body
  );
}
