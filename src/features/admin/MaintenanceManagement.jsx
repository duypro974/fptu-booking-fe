import { useEffect, useState, useMemo } from "react";
import { Wrench, Plus, Calendar, Building2, AlertCircle, X, Clock } from "lucide-react";
import { setMaintenance, getMaintenanceSchedules } from "../../services/maintenanceService";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import AdminLayout, { AdminHeader, AdminContent } from "../../components/layout/AdminLayout";

export default function MaintenanceManagement() {
  const { user } = useAuth();
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    facilityId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    if (user?.campus || user?.campusId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Convert user.campus hoặc user.campusId sang campusId
      let campusId = null;
      
      if (user?.campusId) {
        campusId = user.campusId;
      } else if (typeof user?.campus === 'number') {
        campusId = user.campus;
      } else if (typeof user?.campus === 'string') {
        const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
        campusId = campusMap[user.campus.toLowerCase()] || null;
      }

      if (!campusId) {
        campusId = 2; // Default to HCM
      }

      // Load rooms và maintenance schedules
      const [roomsData, schedulesData] = await Promise.all([
        api.getRooms({ 
          campusId,
          includeInactive: false,
          allStatuses: false // Chỉ lấy phòng ACTIVE (không lấy đang maintenance)
        }),
        getMaintenanceSchedules().catch(err => {
          // Nếu API chưa có hoặc lỗi, trả về empty array
          console.warn("[MaintenanceManagement] Lỗi tải maintenance schedules:", err);
          return [];
        })
      ]);

      setRooms(Array.isArray(roomsData) ? roomsData : []);
      // API trả về array trực tiếp, không cần .data
      setMaintenanceSchedules(Array.isArray(schedulesData) ? schedulesData : []);
    } catch (error) {
      console.error("[MaintenanceManagement] Lỗi tải dữ liệu:", error);
      setRooms([]);
      setMaintenanceSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    setShowForm(true);
    setFormData({
      facilityId: "",
      startDate: "",
      endDate: "",
      reason: "",
    });
    setFormError("");
    setFormSuccess(false);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      facilityId: "",
      startDate: "",
      endDate: "",
      reason: "",
    });
    setFormError("");
    setFormSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.facilityId) {
      setFormError("Vui lòng chọn phòng");
      return;
    }
    
    if (!formData.startDate) {
      setFormError("Vui lòng chọn ngày bắt đầu");
      return;
    }

    if (!formData.reason.trim()) {
      setFormError("Vui lòng nhập lý do bảo trì");
      return;
    }

    setFormLoading(true);
    setFormError("");
    setFormSuccess(false);

    try {
      // Format dates to ISO string
      const startDate = new Date(formData.startDate).toISOString();
      const endDate = formData.endDate ? new Date(formData.endDate).toISOString() : null;

      // Validate endDate >= startDate
      if (endDate && new Date(endDate) < new Date(startDate)) {
        setFormError("Ngày kết thúc phải sau ngày bắt đầu");
        setFormLoading(false);
        return;
      }

      const result = await setMaintenance({
        facilityId: Number(formData.facilityId),
        startDate,
        endDate,
        reason: formData.reason.trim(),
      });

      console.log("[MaintenanceManagement] Set maintenance result:", result);
      
      setFormSuccess(true);
      
      // Reload data after 1 second
      setTimeout(async () => {
        await loadData();
        handleCloseForm();
      }, 1500);
    } catch (error) {
      console.error("[MaintenanceManagement] Lỗi thiết lập bảo trì:", error);
      setFormError(
        error?.response?.data?.message ||
        error?.message ||
        "Không thể thiết lập bảo trì. Vui lòng thử lại."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const formatDateTime = (dateString) => {
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

  const isMaintenanceActive = (schedule) => {
    // Ưu tiên check status từ API, nếu không có thì tính từ date
    if (schedule.status === "ACTIVE") return true;
    if (schedule.status === "SCHEDULED" || schedule.status === "COMPLETED") return false;
    
    if (!schedule.startDate) return false;
    const now = new Date();
    const start = new Date(schedule.startDate);
    const end = schedule.endDate ? new Date(schedule.endDate) : null;
    
    if (now < start) return false; // Chưa bắt đầu
    if (end && now > end) return false; // Đã kết thúc
    return true; // Đang bảo trì
  };

  const isMaintenanceUpcoming = (schedule) => {
    if (schedule.status === "SCHEDULED") return true;
    if (!schedule.startDate) return false;
    const now = new Date();
    const start = new Date(schedule.startDate);
    return now < start; // Chưa bắt đầu
  };

  // Filter rooms - chỉ hiển thị phòng ACTIVE và CHƯA có trong danh sách maintenance schedules
  const availableRooms = useMemo(() => {
    // Lấy danh sách facilityId đang bảo trì (chưa kết thúc)
    const now = new Date();
    const maintenanceFacilityIds = new Set(
      maintenanceSchedules
        .filter(schedule => {
          // Chỉ lấy những schedule chưa kết thúc
          if (!schedule.startDate) return false;
          const start = new Date(schedule.startDate);
          const end = schedule.endDate ? new Date(schedule.endDate) : null;
          
          // Nếu chưa bắt đầu hoặc đã kết thúc thì không tính
          if (now < start) return false; // Chưa bắt đầu
          if (end && now > end) return false; // Đã kết thúc
          return true; // Đang bảo trì
        })
        .map(schedule => schedule.facilityId)
    );

    return rooms.filter(room => {
      const status = String(room.status || "").toUpperCase();
      const isActive = status === "ACTIVE";
      const isNotInMaintenance = !maintenanceFacilityIds.has(room.id);
      return isActive && isNotInMaintenance;
    });
  }, [rooms, maintenanceSchedules]);

  return (
    <AdminLayout>
      {/* Header */}
      <AdminHeader>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Bảo trì Phòng</h1>
            <p className="text-gray-500">Thiết lập và quản lý lịch bảo trì phòng tại {user?.campusName}.</p>
          </div>
          <Button onClick={handleOpenForm} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Thiết lập bảo trì
          </Button>
        </div>
      </AdminHeader>

      {/* Content */}
      <AdminContent>
        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" onClick={handleCloseForm} />
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 px-6 pt-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-orange-600" />
                    Thiết lập Bảo trì Phòng
                  </h2>
                  <button
                    onClick={handleCloseForm}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="px-6 overflow-y-auto flex-1 space-y-4">
                  {/* Info Alert */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Lưu ý:</p>
                        <p>Khi thiết lập bảo trì, hệ thống sẽ tự động:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Tìm phòng thay thế cho các booking APPROVED bị trùng lịch</li>
                          <li>Chuyển booking sang phòng mới nếu tìm thấy</li>
                          <li>Hủy booking nếu không tìm thấy phòng thay thế</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Facility Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn phòng <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.facilityId}
                      onChange={(e) => setFormData({ ...formData, facilityId: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">-- Chọn phòng --</option>
                      {availableRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} {room.type ? `(${room.type})` : ""} - {room.capacity || "N/A"} người
                        </option>
                      ))}
                    </select>
                    {availableRooms.length === 0 && (
                      <p className="text-sm text-orange-600 mt-2">
                        ⚠️ Tất cả phòng đang hoạt động đã được thiết lập bảo trì hoặc không có phòng nào khả dụng.
                      </p>
                    )}
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày bắt đầu bảo trì <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  {/* End Date (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày kết thúc bảo trì (Tùy chọn)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.startDate || new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nếu để trống, phòng sẽ bảo trì vô thời hạn cho đến khi bạn cập nhật lại.
                    </p>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lý do bảo trì <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      placeholder="Nhập lý do bảo trì phòng..."
                    />
                  </div>

                  {/* Error/Success Messages */}
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                      Thiết lập bảo trì thành công! Hệ thống đang xử lý các booking bị ảnh hưởng...
                    </div>
                  )}
                </form>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t pt-4 px-6 pb-6 flex justify-end gap-3">
                  <Button variant="secondary" onClick={handleCloseForm}>
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={formLoading || formSuccess}
                  >
                    {formLoading ? "Đang xử lý..." : "Thiết lập bảo trì"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Maintenance Schedules List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu...</p>
          </div>
        ) : maintenanceSchedules.length === 0 ? (
          <Card className="text-center py-12">
            <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">Chưa có lịch bảo trì nào.</p>
            <p className="text-gray-400 text-sm mt-2">Nhấn nút "Thiết lập bảo trì" để tạo lịch mới.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {maintenanceSchedules.map((schedule) => {
              const isActive = isMaintenanceActive(schedule);
              const isUpcoming = isMaintenanceUpcoming(schedule);
              
              return (
                <Card key={schedule.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-orange-600" />
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {schedule.facility?.name || schedule.roomName || `Phòng #${schedule.facilityId}`}
                          </h3>
                          {schedule.facility?.type && (
                            <p className="text-sm text-gray-500">Loại: {schedule.facility.type}</p>
                          )}
                        </div>
                        <Badge 
                          type={
                            isActive ? "warning" :
                            isUpcoming ? "info" : "secondary"
                          }
                        >
                          {isActive ? "Đang bảo trì" :
                           isUpcoming ? "Sắp bảo trì" : "Đã kết thúc"}
                        </Badge>
                      </div>

                      {/* Time Range */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span>Bắt đầu</span>
                          </div>
                          <p className="font-medium text-gray-900">
                            {formatDateTime(schedule.startDate)}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span>Kết thúc</span>
                          </div>
                          <p className="font-medium text-gray-900">
                            {schedule.endDate ? formatDateTime(schedule.endDate) : "Vô thời hạn"}
                          </p>
                        </div>
                      </div>

                      {/* Reason */}
                      {schedule.reason && (
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>Lý do</span>
                          </div>
                          <p className="text-gray-900">{schedule.reason}</p>
                        </div>
                      )}

                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </AdminContent>
    </AdminLayout>
  );
}

