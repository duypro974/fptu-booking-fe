// src/security/DailySchedule.jsx
import { useState, useEffect } from "react";
import { Calendar, Clock, User, Building2, CheckCircle, XCircle, Search } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { searchGuardBookings, checkInBooking, checkOutBooking } from "../services/bookingService";

export default function DailySchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  // Load bookings khi component mount
  useEffect(() => {
    console.log('[DailySchedule] Component mounted, loading bookings...');
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload khi date thay đổi
  useEffect(() => {
    console.log('[DailySchedule] Date changed to:', selectedDate);
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Reload khi searchKeyword thay đổi (debounce có thể thêm sau nếu cần)
  useEffect(() => {
    console.log('[DailySchedule] Search keyword changed to:', searchKeyword);
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword]);

  const loadBookings = async () => {
    setLoading(true);
    setError("");
    try {
      // Sử dụng API dành riêng cho Security Guard
      // API này chỉ trả về đơn APPROVED trong ngày
      // Khi keyword rỗng, gọi API với chuỗi rỗng để lấy tất cả đơn APPROVED trong ngày
      const keyword = searchKeyword.trim();
      console.log('[DailySchedule] Calling searchGuardBookings with keyword:', keyword || '(empty - will show all)');
      
      // Gọi API với keyword (có thể rỗng)
      const data = await searchGuardBookings(keyword);
      const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
      console.log('[DailySchedule] Received bookings from API:', list.length);
      console.log('[DailySchedule] Sample booking:', list[0]);
      
      // Lọc theo ngày được chọn
      // API chỉ trả về trong ngày hôm nay, nhưng filter để đảm bảo đúng ngày được chọn
      const today = new Date().toISOString().split('T')[0];
      const filtered = list.filter(booking => {
        const bookingDate = booking.date || booking.startTime?.split('T')[0] || booking.bookingDate?.split('T')[0];
        console.log('[DailySchedule] Booking date:', bookingDate, 'Selected date:', selectedDate);
        // Nếu chọn ngày hôm nay, dùng kết quả từ API (đã filter sẵn)
        // Nếu chọn ngày khác, filter theo selectedDate (nhưng API chỉ trả về hôm nay nên sẽ rỗng)
        if (selectedDate === today) {
          return true; // API đã filter trong ngày rồi
        }
        return bookingDate === selectedDate;
      });
      
      console.log('[DailySchedule] Filtered bookings for date', selectedDate, ':', filtered.length);
      setBookings(filtered);
      
      // Nếu không có booking và đang chọn ngày hôm nay, có thể không có booking nào
      if (filtered.length === 0 && selectedDate === today) {
        console.log('[DailySchedule] No bookings found for today');
      }
    } catch (err) {
      setBookings([]);
      console.error('[DailySchedule] Error loading bookings:', err);
      console.error('[DailySchedule] Error response:', err?.response?.data);
      setError(err?.response?.data?.message || err?.message || "Không thể tải lịch trình.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      await checkInBooking(bookingId);
      await loadBookings();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Check-in thất bại.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCheckOut = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      await checkOutBooking(bookingId);
      await loadBookings();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Check-out thất bại.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return String(value);
  };

  const formatTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return String(value);
  };

  const getStatusBadge = (booking) => {
    const isCheckedIn = booking.isCheckedIn || !!booking.checkInTime;
    const isCheckedOut = !!booking.checkOutTime;
    
    if (isCheckedOut) {
      return { type: "secondary", label: "Đã Check-out" };
    }
    if (isCheckedIn) {
      return { type: "success", label: "Đã Check-in" };
    }
    if (booking.status === "APPROVED") {
      return { type: "warning", label: "Chưa Check-in" };
    }
    return { type: "info", label: booking.status || "PENDING" };
  };

  // Nhóm bookings theo slot/time
  const groupedBookings = bookings.reduce((acc, booking) => {
    const timeKey = booking.startTime 
      ? formatTime(booking.startTime) 
      : booking.slots?.join(", ") || "N/A";
    
    if (!acc[timeKey]) {
      acc[timeKey] = [];
    }
    acc[timeKey].push(booking);
    return acc;
  }, {});

  const sortedTimeSlots = Object.keys(groupedBookings).sort((a, b) => {
    // Sắp xếp theo thời gian
    if (a.includes(":") && b.includes(":")) {
      return a.localeCompare(b);
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Lịch trình hàng ngày</h1>
        <p className="text-gray-600 mt-1">Xem và quản lý các đơn đặt phòng trong ngày</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Chọn ngày
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tìm kiếm (Tên SV / Mã Booking)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && loadBookings()}
                placeholder="Nhập tên hoặc mã booking..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button onClick={loadBookings} disabled={loading} className="w-full">
              {loading ? "Đang tải..." : "Tải lại"}
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Schedule Display */}
      {loading && bookings.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          Đang tải lịch trình...
        </Card>
      ) : bookings.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          Không có đơn đặt phòng nào trong ngày {formatDate(selectedDate)}.
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedTimeSlots.map((timeSlot) => (
            <Card key={timeSlot} className="overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <h2 className="font-semibold text-gray-800">
                    {timeSlot} ({groupedBookings[timeSlot].length} đơn)
                  </h2>
                </div>
              </div>
              <div className="divide-y">
                {groupedBookings[timeSlot].map((booking) => {
                  const statusBadge = getStatusBadge(booking);
                  const isCheckedIn = booking.isCheckedIn || !!booking.checkInTime;
                  const isCheckedOut = !!booking.checkOutTime;
                  const canCheckIn = !isCheckedIn && booking.status === "APPROVED";
                  const canCheckOut = isCheckedIn && !isCheckedOut;

                  return (
                    <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge type={statusBadge.type}>{statusBadge.label}</Badge>
                            <span className="font-semibold text-gray-900">
                              Mã: {booking.bookingCode || `#${booking.id}`}
                            </span>
                            {booking.status && (
                              <Badge
                                type={
                                  booking.status === "APPROVED" ? "success" :
                                  booking.status === "PENDING" ? "warning" :
                                  booking.status === "REJECTED" ? "danger" : "info"
                                }
                                className="text-xs"
                              >
                                {booking.status}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{booking.user?.fullName || booking.fullName || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>{booking.facility?.name || booking.facilityName || "—"}</span>
                            </div>
                            {booking.startTime && booking.endTime && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Bắt đầu: {formatTime(booking.startTime)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Kết thúc: {formatTime(booking.endTime)}</span>
                                </div>
                              </>
                            )}
                            {booking.attendeeCount && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>Số người: {booking.attendeeCount}</span>
                              </div>
                            )}
                          </div>

                          {booking.checkInTime && (
                            <div className="text-xs text-gray-500">
                              Check-in: {formatDate(booking.checkInTime)}
                            </div>
                          )}
                          {booking.checkOutTime && (
                            <div className="text-xs text-gray-500">
                              Check-out: {formatDate(booking.checkOutTime)}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {canCheckIn && (
                            <Button
                              variant="success"
                              onClick={() => handleCheckIn(booking.id)}
                              disabled={processingId === booking.id}
                              className="whitespace-nowrap"
                            >
                              {processingId === booking.id ? (
                                "Đang xử lý..."
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Check-in
                                </>
                              )}
                            </Button>
                          )}
                          {canCheckOut && (
                            <Button
                              variant="secondary"
                              onClick={() => handleCheckOut(booking.id)}
                              disabled={processingId === booking.id}
                              className="whitespace-nowrap"
                            >
                              {processingId === booking.id ? (
                                "Đang xử lý..."
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Check-out
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
