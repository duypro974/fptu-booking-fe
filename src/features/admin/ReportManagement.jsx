import { useEffect, useState, useMemo } from "react";
import { Eye, Search, Filter, FileText, Calendar, User, Building2, ChevronLeft, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import { getReports, getReportDetail } from "../../services/adminService";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import AdminLayout, { AdminHeader, AdminContent } from "../../components/layout/AdminLayout";

export default function ReportManagement() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "PENDING", "RESOLVED", "REJECTED"
  const [typeFilter, setTypeFilter] = useState("all"); // "all" hoặc loại report
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reportTypes, setReportTypes] = useState([]);
  const itemsPerPage = 10;

  useEffect(() => {
    loadReports();
  }, [user, currentPage, statusFilter, typeFilter, searchTerm]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (typeFilter !== "all") {
        params.type = typeFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await getReports(params);
      
      // Handle both paginated and non-paginated responses
      if (response?.data && Array.isArray(response.data)) {
        setReports(response.data);
        setTotalPages(response.totalPages || 1);
        setTotalItems(response.total || response.data.length);
        
        // Extract unique report types
        const types = [...new Set(response.data.map(r => r.type || r.category).filter(Boolean))];
        setReportTypes(types);
      } else if (Array.isArray(response)) {
        setReports(response);
        setTotalPages(1);
        setTotalItems(response.length);
        
        const types = [...new Set(response.map(r => r.type || r.category).filter(Boolean))];
        setReportTypes(types);
      } else {
        setReports([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("[ReportManagement] Lỗi tải danh sách report:", error);
      setReports([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (report) => {
    setSelectedReport(null);
    setShowDetailModal(true);
    setLoadingDetail(true);
    
    try {
      const detail = await getReportDetail(report.id);
      setSelectedReport(detail);
    } catch (error) {
      console.error("[ReportManagement] Lỗi tải chi tiết report:", error);
      // Fallback: use report data if detail API fails
      setSelectedReport(report);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedReport(null);
    setShowDetailModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const getStatusBadge = (status) => {
    const statusUpper = String(status || "").toUpperCase();
    if (statusUpper === "PENDING") {
      return <Badge type="warning">Chờ xử lý</Badge>;
    } else if (statusUpper === "RESOLVED") {
      return <Badge type="success">Đã xử lý</Badge>;
    } else if (statusUpper === "REJECTED") {
      return <Badge type="danger">Từ chối</Badge>;
    }
    return <Badge type="info">{status || "N/A"}</Badge>;
  };

  const getTypeLabel = (type) => {
    if (!type) return "N/A";
    const typeLower = String(type).toLowerCase();
    if (typeLower.includes("equipment") || typeLower.includes("thiết bị")) {
      return "Hỏng hóc thiết bị";
    } else if (typeLower.includes("clean") || typeLower.includes("vệ sinh")) {
      return "Vệ sinh";
    } else if (typeLower.includes("attitude") || typeLower.includes("thái độ")) {
      return "Thái độ";
    } else if (typeLower.includes("other") || typeLower.includes("khác")) {
      return "Khác";
    }
    return type;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <AdminLayout>
      {/* Header - Fixed */}
      <AdminHeader>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Báo cáo</h1>
            <p className="text-gray-500">Xem và xử lý các báo cáo sự cố từ người dùng tại {user?.campusName}.</p>
          </div>
          <Badge type="info" className="text-base px-4 py-2">
            {totalItems} báo cáo
          </Badge>
        </div>
      </AdminHeader>

      {/* Content - Scrollable */}
      <AdminContent>
        {/* Filters */}
        <Card className="mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên người báo cáo hoặc tên phòng..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="RESOLVED">Đã xử lý</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </div>

            {/* Type Filter */}
            {reportTypes.length > 0 && (
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="all">Tất cả loại</option>
                {reportTypes.map((type) => (
                  <option key={type} value={type}>
                    {getTypeLabel(type)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </Card>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu...</p>
          </div>
        ) : reports.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">Không tìm thấy báo cáo nào.</p>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4 font-semibold text-gray-700">ID</th>
                      <th className="p-4 font-semibold text-gray-700">Tiêu đề/Loại</th>
                      <th className="p-4 font-semibold text-gray-700">Phòng</th>
                      <th className="p-4 font-semibold text-gray-700">Người báo</th>
                      <th className="p-4 font-semibold text-gray-700">Ngày tạo</th>
                      <th className="p-4 font-semibold text-gray-700">Trạng thái</th>
                      <th className="p-4 font-semibold text-gray-700 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-sm text-gray-600">#{report.id}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {report.title || report.subject || getTypeLabel(report.type || report.category) || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Building2 className="w-4 h-4" />
                            <span>{report.facility?.name || report.roomName || report.facilityName || "N/A"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="w-4 h-4" />
                            <div>
                              <div className="font-medium">{report.reporter?.fullName || report.reporterName || report.user?.fullName || "N/A"}</div>
                              {(report.reporter?.email || report.reporterEmail || report.user?.email) && (
                                <div className="text-xs text-gray-500">
                                  {report.reporter?.email || report.reporterEmail || report.user?.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(report.createdAt || report.created_at || report.date)}
                          </div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(report)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Xem chi tiết
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Trang {currentPage} / {totalPages} ({totalItems} báo cáo)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? "bg-orange-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </AdminContent>

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" onClick={handleCloseDetail} />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 px-6 pt-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Chi tiết báo cáo
                </h2>
                <button
                  onClick={handleCloseDetail}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="mb-4 px-6 overflow-y-auto flex-1">
                {loadingDetail ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Đang tải chi tiết...</p>
                  </div>
                ) : selectedReport ? (
                  <div className="space-y-4">
                    {/* ID */}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mã báo cáo</label>
                      <p className="text-gray-900 font-medium mt-1">#{selectedReport.id}</p>
                    </div>

                    {/* Title/Type */}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tiêu đề/Loại</label>
                      <p className="text-gray-900 font-semibold text-lg mt-1">
                        {selectedReport.title || selectedReport.subject || getTypeLabel(selectedReport.type || selectedReport.category) || "N/A"}
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                      <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                    </div>

                    {/* Facility */}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phòng</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 font-medium">
                          {selectedReport.facility?.name || selectedReport.roomName || selectedReport.facilityName || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Reporter */}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Người báo cáo</label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-900 font-medium">
                            {selectedReport.reporter?.fullName || selectedReport.reporterName || selectedReport.user?.fullName || "N/A"}
                          </p>
                          {(selectedReport.reporter?.email || selectedReport.reporterEmail || selectedReport.user?.email) && (
                            <p className="text-sm text-gray-500">
                              {selectedReport.reporter?.email || selectedReport.reporterEmail || selectedReport.user?.email}
                            </p>
                          )}
                          {(selectedReport.reporter?.studentId || selectedReport.studentId) && (
                            <p className="text-sm text-gray-500">
                              MSSV: {selectedReport.reporter?.studentId || selectedReport.studentId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ngày tạo</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 font-medium">
                          {formatDate(selectedReport.createdAt || selectedReport.created_at || selectedReport.date)}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {(selectedReport.description || selectedReport.content || selectedReport.details) && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Nội dung chi tiết</label>
                        <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-gray-900 whitespace-pre-wrap">
                            {selectedReport.description || selectedReport.content || selectedReport.details}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Images */}
                    {selectedReport.images && Array.isArray(selectedReport.images) && selectedReport.images.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Hình ảnh bằng chứng</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedReport.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image.url || image || typeof image === 'string' ? image : URL.createObjectURL(image)}
                                alt={`Evidence ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(image.url || image || (typeof image === 'string' ? image : URL.createObjectURL(image)), '_blank')}
                              />
                              <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Response */}
                    {(selectedReport.adminResponse || selectedReport.response || selectedReport.adminNote) && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phản hồi của Admin</label>
                        <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-gray-900 whitespace-pre-wrap">
                            {selectedReport.adminResponse || selectedReport.response || selectedReport.adminNote}
                          </p>
                          {selectedReport.respondedAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              Phản hồi lúc: {formatDate(selectedReport.respondedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Không thể tải chi tiết báo cáo.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t pt-4 px-6 pb-6 flex justify-end">
                <Button onClick={handleCloseDetail}>
                  Đóng
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

