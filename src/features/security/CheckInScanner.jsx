// src/features/security/CheckInScanner.jsx
import { useState } from "react";
import { Search, CheckCircle, XCircle, Clock, User, Calendar, Building2, AlertTriangle, X, Plus } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { searchGuardBookings, checkInBooking, checkOutBooking, reportFacilityIssue } from "../../services/bookingService";

export default function CheckInScanner() {
  const [keyword, setKeyword] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Report issue state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({
    facilityId: "",
    title: "",
    description: "",
    category: "DAMAGE",
    imageUrls: [""],
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      setError("Vui lòng nhập từ khóa tìm kiếm");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await searchGuardBookings(keyword.trim());
      const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      setBookings([]);
      setError(err?.response?.data?.message || err?.message || "Không thể tìm kiếm đơn đặt phòng.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      await checkInBooking(bookingId);
      // Refresh danh sách sau khi check-in thành công
      if (keyword.trim()) {
        await handleSearch();
      }
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
      // Refresh danh sách sau khi check-out thành công
      if (keyword.trim()) {
        await handleSearch();
      }
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

  const getStatusBadge = (booking) => {
    if (booking.checkInTime && !booking.checkOutTime) {
      return { type: "success", label: "Đã Check-in" };
    }
    if (booking.checkOutTime) {
      return { type: "secondary", label: "Đã Check-out" };
    }
    return { type: "warning", label: "Chưa Check-in" };
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    setReportLoading(true);
    setReportError("");
    setReportSuccess(false);

    if (!reportData.facilityId || !reportData.title || !reportData.description) {
      setReportError("Vui lòng điền đầy đủ thông tin báo cáo.");
      setReportLoading(false);
      return;
    }

    try {
      const payload = {
        title: reportData.title,
        description: reportData.description,
        category: reportData.category,
        imageUrls: reportData.imageUrls.filter(url => url.trim() !== ""),
      };

      await reportFacilityIssue(Number(reportData.facilityId), payload);
      setReportSuccess(true);
      setReportData({
        facilityId: "",
        title: "",
        description: "",
        category: "DAMAGE",
        imageUrls: [""],
      });
      
      setTimeout(() => {
        setShowReportForm(false);
        setReportSuccess(false);
      }, 2000);
    } catch (err) {
      setReportError(err?.response?.data?.message || err?.message || "Báo cáo sự cố thất bại.");
    } finally {
      setReportLoading(false);
    }
  };

  const addImageUrl = () => {
    setReportData({ ...reportData, imageUrls: [...reportData.imageUrls, ""] });
  };

  const removeImageUrl = (index) => {
    const newUrls = reportData.imageUrls.filter((_, i) => i !== index);
    setReportData({ ...reportData, imageUrls: newUrls.length > 0 ? newUrls : [""] });
  };

  const updateImageUrl = (index, value) => {
    const newUrls = [...reportData.imageUrls];
    newUrls[index] = value;
    setReportData({ ...reportData, imageUrls: newUrls });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Check-in / Check-out</h1>
        <p className="text-gray-600 mt-1">Tìm kiếm đơn đặt phòng theo tên sinh viên hoặc mã booking</p>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Nhập tên sinh viên hoặc mã booking..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "Đang tìm..." : "Tìm kiếm"}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {bookings.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-800">Kết quả tìm kiếm ({bookings.length})</h2>
          </div>
          <div className="divide-y">
            {bookings.map((booking) => {
              const statusBadge = getStatusBadge(booking);
              const canCheckIn = !booking.checkInTime;
              const canCheckOut = booking.checkInTime && !booking.checkOutTime;

              return (
                <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge type={statusBadge.type}>{statusBadge.label}</Badge>
                        <span className="font-semibold text-gray-900">
                          Mã: {booking.bookingCode || `#${booking.id}`}
                        </span>
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
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.date || booking.bookingDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Slot: {booking.slots?.join(", ") || booking.slot || "—"}</span>
                        </div>
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
      )}

      {!loading && keyword && bookings.length === 0 && (
        <Card className="p-8 text-center text-gray-500">
          Không tìm thấy đơn đặt phòng nào.
        </Card>
      )}

      {/* Report Facility Issue Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Báo cáo sự cố phòng
            </h2>
            <p className="text-sm text-gray-600 mt-1">Báo cáo sự cố, hư hỏng của phòng</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setShowReportForm(!showReportForm);
              setReportError("");
              setReportSuccess(false);
            }}
          >
            {showReportForm ? "Ẩn form" : "Báo cáo sự cố"}
          </Button>
        </div>

        {showReportForm && (
          <form onSubmit={handleReportIssue} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Mã phòng (Facility ID) *
                </label>
                <input
                  type="number"
                  required
                  value={reportData.facilityId}
                  onChange={(e) => setReportData({ ...reportData, facilityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Nhập ID phòng"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Loại sự cố *
                </label>
                <select
                  required
                  value={reportData.category}
                  onChange={(e) => setReportData({ ...reportData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="DAMAGE">Hư hỏng</option>
                  <option value="MAINTENANCE">Bảo trì</option>
                  <option value="CLEANING">Vệ sinh</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Tiêu đề *
              </label>
              <input
                type="text"
                required
                value={reportData.title}
                onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ví dụ: Đèn bàn hỏng, Máy lạnh không hoạt động..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Mô tả chi tiết *
              </label>
              <textarea
                required
                value={reportData.description}
                onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                placeholder="Mô tả chi tiết về sự cố..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                URL ảnh (tùy chọn)
              </label>
              <div className="space-y-2">
                {reportData.imageUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => updateImageUrl(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="https://example.com/image.jpg"
                    />
                    {reportData.imageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageUrl(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Thêm URL ảnh
                </button>
              </div>
            </div>

            {reportError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                {reportError}
              </div>
            )}

            {reportSuccess && (
              <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg">
                Báo cáo sự cố đã được gửi thành công!
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={reportLoading}
                className="flex-1"
              >
                {reportLoading ? "Đang gửi..." : "Gửi báo cáo"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowReportForm(false);
                  setReportData({
                    facilityId: "",
                    title: "",
                    description: "",
                    category: "DAMAGE",
                    imageUrls: [""],
                  });
                  setReportError("");
                  setReportSuccess(false);
                }}
              >
                Hủy
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
