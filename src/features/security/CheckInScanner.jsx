// src/features/security/CheckInScanner.jsx
import { useState } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Building2,
  AlertTriangle,
  X,
  Plus,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

import {
  searchCheckinBookings,
  checkInBooking,
  checkOutBooking,
  reportFacilityIssue,
  reportBookingIssue,
} from "../../services/securityService";
import { getFacilities } from "../../services/resourceService";
import { useAuth } from "../../context/AuthContext";

export default function CheckInScanner() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Report issue state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState("facility"); // "facility" | "booking"
  const [selectedBookingForReport, setSelectedBookingForReport] = useState(null);
  const [reportData, setReportData] = useState({
    facilityId: "",
    bookingId: null,
    title: "",
    description: "",
    category: "DAMAGE",
    imageUrls: [""],
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  
  // Facilities list for dropdown
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  const normalizeBookings = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const handleSearch = async () => {
    const kw = keyword.trim();
    if (!kw) {
      setError("Vui lòng nhập từ khóa tìm kiếm");
      setBookings([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await searchCheckinBookings(kw);

      console.log("[Guard Search] keyword =", kw);
      console.log("[Guard Search] raw response =", data);

      const list = normalizeBookings(data);
      setBookings(list);
    } catch (err) {
      console.error("[Guard Search] error =", err);
      setBookings([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể tìm kiếm đơn đặt phòng."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      await checkInBooking(bookingId);
      if (keyword.trim()) await handleSearch();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Check-in thất bại."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleCheckOut = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      await checkOutBooking(bookingId);
      if (keyword.trim()) await handleSearch();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Check-out thất bại."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return String(value);
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }
    return String(value);
  };

  const getStatusBadge = (booking) => {
    // backend của bạn có isCheckedIn (boolean)
    // nếu có thêm checkOutTime thì ưu tiên hiển thị check-out
    if (booking.checkOutTime) return { type: "secondary", label: "Đã Check-out" };
    if (booking.isCheckedIn || booking.checkInTime)
      return { type: "success", label: "Đã Check-in" };
    return { type: "warning", label: "Chưa Check-in" };
  };

  // Load facilities when form is opened
  const loadFacilities = async () => {
    if (!user) return;
    
    setLoadingFacilities(true);
    try {
      const campusId = user?.campusId || (user?.campus === "hcm" ? 2 : user?.campus === "hn" ? 1 : null);
      const data = await getFacilities({ campusId });
      const list = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setFacilities(list);
    } catch (err) {
      console.error("[CheckInScanner] Error loading facilities:", err);
      setFacilities([]);
    } finally {
      setLoadingFacilities(false);
    }
  };

  // Load facilities when form is opened
  const handleToggleReportForm = () => {
    const newShow = !showReportForm;
    setShowReportForm(newShow);
    setReportError("");
    setReportSuccess(false);
    
    if (newShow && facilities.length === 0 && reportType === "facility") {
      loadFacilities();
    }
  };

  const handleOpenBookingReport = (booking) => {
    setSelectedBookingForReport(booking);
    setReportType("booking");
    setReportData({
      facilityId: "",
      bookingId: booking.id,
      title: "",
      description: "",
      category: "INCIDENT",
      imageUrls: [""],
    });
    setShowReportForm(true);
    setReportError("");
    setReportSuccess(false);
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    setReportLoading(true);
    setReportError("");
    setReportSuccess(false);

    if (!reportData.title || !reportData.description) {
      setReportError("Vui lòng điền đầy đủ thông tin báo cáo.");
      setReportLoading(false);
      return;
    }

    // Validate theo loại report
    if (reportType === "facility" && !reportData.facilityId) {
      setReportError("Vui lòng chọn phòng.");
      setReportLoading(false);
      return;
    }

    if (reportType === "booking" && !reportData.bookingId) {
      setReportError("Vui lòng chọn booking.");
      setReportLoading(false);
      return;
    }

    try {
      if (reportType === "facility") {
        // Report theo phòng: POST /reports/facility/{facilityId}
        const payload = {
          title: reportData.title || "Facility Issue",
          category: reportData.category || "DAMAGE",
          description: reportData.description,
          imageUrls: reportData.imageUrls.filter((url) => url.trim() !== ""),
        };
        
        console.log("[CheckInScanner] Reporting facility issue:", {
          facilityId: reportData.facilityId,
          payload
        });
        
        await reportFacilityIssue(Number(reportData.facilityId), payload);
      } else {
        // Report theo booking: POST /reports/booking
        const payload = {
          bookingId: Number(reportData.bookingId),
          title: reportData.title || "Booking Issue",
          category: reportData.category || "INCIDENT",
          description: reportData.description,
          imageUrls: reportData.imageUrls.filter((url) => url.trim() !== ""),
        };
        
        console.log("[CheckInScanner] Reporting booking issue:", payload);
        
        await reportBookingIssue(payload);
      }

      setReportSuccess(true);
      setReportData({
        facilityId: "",
        bookingId: null,
        title: "",
        description: "",
        category: reportType === "facility" ? "DAMAGE" : "INCIDENT",
        imageUrls: [""],
      });
      setSelectedBookingForReport(null);
      setReportType("facility");

      setTimeout(() => {
        setShowReportForm(false);
        setReportSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("[CheckInScanner] Report error:", err);
      setReportError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể gửi báo cáo sự cố."
      );
    } finally {
      setReportLoading(false);
    }
  };

  const addImageUrl = () => {
    setReportData({ ...reportData, imageUrls: [...reportData.imageUrls, ""] });
  };

  const removeImageUrl = (index) => {
    const newUrls = reportData.imageUrls.filter((_, i) => i !== index);
    setReportData({
      ...reportData,
      imageUrls: newUrls.length > 0 ? newUrls : [""],
    });
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
        <p className="text-gray-600 mt-1">Tìm theo tên SV hoặc mã booking</p>
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
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
            <h2 className="font-semibold text-gray-800">
              Kết quả ({bookings.length})
            </h2>
          </div>

          <div className="divide-y">
            {bookings.map((booking) => {
              const statusBadge = getStatusBadge(booking);

              // theo swagger: isCheckedIn
              const canCheckIn = !booking.isCheckedIn && !booking.checkInTime;
              const canCheckOut =
                (booking.isCheckedIn || booking.checkInTime) && !booking.checkOutTime;

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
                          <span>
                            {formatDateTime(booking.startTime)} → {formatDateTime(booking.endTime)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Trạng thái: {booking.status || "—"}</span>
                        </div>
                      </div>

                      {booking.startTime && booking.endTime && (
                        <div className="text-xs text-gray-500">
                          Thời gian: {formatDate(booking.startTime)} - {formatDate(booking.endTime)}
                        </div>
                      )}
                      {booking.checkInTime && (
                        <div className="text-xs text-gray-500">
                          Check-in: {formatDateTime(booking.checkInTime)}
                        </div>
                      )}
                      {booking.checkOutTime && (
                        <div className="text-xs text-gray-500">
                          Check-out: {formatDateTime(booking.checkOutTime)}
                        </div>
                      )}
                      {booking.status && (
                        <div className="text-xs">
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
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
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

                      {/* Nút báo cáo sự cố cho booking */}
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenBookingReport(booking)}
                        className="whitespace-nowrap"
                        title="Báo cáo sự cố trong giờ booking"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Báo cáo
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!loading && keyword.trim() && bookings.length === 0 && (
        <Card className="p-8 text-center text-gray-500">
          Không tìm thấy đơn đặt phòng nào.
        </Card>
      )}

      {/* Report Issue Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {reportType === "booking" ? "Báo cáo sự cố trong giờ Booking" : "Báo cáo sự cố phòng"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {reportType === "booking" 
                ? "Báo cáo sự cố xảy ra trong giờ booking" 
                : "Báo cáo sự cố, hư hỏng của phòng"}
            </p>
          </div>
          {reportType === "facility" && (
            <Button
              variant="secondary"
              onClick={handleToggleReportForm}
            >
              {showReportForm ? "Ẩn form" : "Báo cáo sự cố"}
            </Button>
          )}
        </div>

        {showReportForm && (
          <form onSubmit={handleReportIssue} className="space-y-4 mt-4">
            {/* Hiển thị thông tin booking nếu là report booking */}
            {reportType === "booking" && selectedBookingForReport && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-900">Thông tin Booking</h3>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowReportForm(false);
                      setSelectedBookingForReport(null);
                      setReportType("facility");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                  <div><strong>Mã:</strong> {selectedBookingForReport.bookingCode || `#${selectedBookingForReport.id}`}</div>
                  <div><strong>Phòng:</strong> {selectedBookingForReport.facility?.name || selectedBookingForReport.facilityName || "—"}</div>
                  <div><strong>Người đặt:</strong> {selectedBookingForReport.user?.fullName || selectedBookingForReport.fullName || "—"}</div>
                  <div><strong>Thời gian:</strong> {formatDateTime(selectedBookingForReport.startTime)} → {formatDateTime(selectedBookingForReport.endTime)}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chỉ hiển thị chọn phòng nếu là report facility */}
              {reportType === "facility" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Chọn phòng *
                  </label>
                {loadingFacilities ? (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm">
                    Đang tải danh sách phòng...
                  </div>
                ) : (
                  <select
                    required
                    value={reportData.facilityId}
                    onChange={(e) => setReportData({ ...reportData, facilityId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  >
                    <option value="">-- Chọn phòng --</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name} {facility.type?.name ? `(${facility.type.name})` : facility.typeName ? `(${facility.typeName})` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {facilities.length === 0 && !loadingFacilities && (
                  <p className="text-xs text-gray-500 mt-1">
                    Không có phòng nào. Vui lòng thử lại sau.
                  </p>
                )}
                </div>
              )}

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
                  {reportType === "booking" ? (
                    <>
                      <option value="INCIDENT">Sự cố</option>
                      <option value="DAMAGE">Hư hỏng</option>
                      <option value="MAINTENANCE">Bảo trì</option>
                      <option value="CLEANING">Vệ sinh</option>
                      <option value="OTHER">Khác</option>
                    </>
                  ) : (
                    <>
                      <option value="DAMAGE">Hư hỏng</option>
                      <option value="MAINTENANCE">Bảo trì</option>
                      <option value="CLEANING">Vệ sinh</option>
                      <option value="OTHER">Khác</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tiêu đề *</label>
              <input
                type="text"
                required
                value={reportData.title}
                onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Ví dụ: Đèn hỏng, Máy lạnh không hoạt động..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mô tả chi tiết *</label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">URL ảnh (tùy chọn)</label>
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
              <Button type="submit" disabled={reportLoading} className="flex-1">
                {reportLoading ? "Đang gửi..." : "Gửi báo cáo"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowReportForm(false);
                  setReportData({
                    facilityId: "",
                    bookingId: null,
                    title: "",
                    description: "",
                    category: reportType === "facility" ? "DAMAGE" : "INCIDENT",
                    imageUrls: [""],
                  });
                  setSelectedBookingForReport(null);
                  setReportType("facility");
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
