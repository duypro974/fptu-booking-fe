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

  // Load schedules từ sessionStorage khi component mount (sau F5)
  useEffect(() => {
    try {
      const savedSchedules = sessionStorage.getItem('maintenanceSchedules');
      if (savedSchedules) {
        const parsed = JSON.parse(savedSchedules);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("[MaintenanceManagement] Loaded", parsed.length, "schedules from sessionStorage");
          setMaintenanceSchedules(parsed);
        }
      }
    } catch (e) {
      console.warn("[MaintenanceManagement] Error loading schedules from sessionStorage:", e);
    }
  }, []);

  // Load schedules từ sessionStorage khi component mount (sau F5)
  useEffect(() => {
    try {
      const savedSchedules = sessionStorage.getItem('maintenanceSchedules');
      if (savedSchedules) {
        const parsed = JSON.parse(savedSchedules);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("[MaintenanceManagement] Loaded", parsed.length, "schedules from sessionStorage");
          setMaintenanceSchedules(parsed);
        }
      }
    } catch (e) {
      console.warn("[MaintenanceManagement] Error loading schedules from sessionStorage:", e);
    }
  }, []);

  useEffect(() => {
    if (user?.campus || user?.campusId) {
      loadData();
    }
  }, [user]);
  
  // Lưu schedules vào sessionStorage khi có thay đổi
  useEffect(() => {
    if (maintenanceSchedules.length > 0) {
      try {
        sessionStorage.setItem('maintenanceSchedules', JSON.stringify(maintenanceSchedules));
      } catch (e) {
        console.warn("[MaintenanceManagement] Error saving schedules to sessionStorage:", e);
      }
    }
  }, [maintenanceSchedules]);
  
  // Lưu schedules vào sessionStorage khi có thay đổi
  useEffect(() => {
    if (maintenanceSchedules.length > 0) {
      try {
        sessionStorage.setItem('maintenanceSchedules', JSON.stringify(maintenanceSchedules));
        console.log("[MaintenanceManagement] Saved", maintenanceSchedules.length, "schedules to sessionStorage");
      } catch (e) {
        console.warn("[MaintenanceManagement] Error saving schedules to sessionStorage:", e);
      }
    }
  }, [maintenanceSchedules]);

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

      // Load rooms (bao gồm cả maintenance) và maintenance schedules
      const [roomsData, schedulesData] = await Promise.all([
        api.getRooms({ 
          campusId,
          includeInactive: true,
          allStatuses: true // Lấy tất cả status bao gồm cả MAINTENANCE
        }),
        getMaintenanceSchedules().catch(err => {
          // Nếu API chưa có hoặc lỗi, trả về null để fallback
          console.warn("[MaintenanceManagement] Lỗi tải maintenance schedules:", err);
          return null;
        })
      ]);

      const rooms = Array.isArray(roomsData) ? roomsData : [];
      setRooms(rooms);
      
      // Nếu API maintenance schedules fail, tạo từ danh sách phòng có status maintenance
      if (schedulesData === null || !Array.isArray(schedulesData) || schedulesData.length === 0) {
        console.log("[MaintenanceManagement] Fallback: Tạo maintenance schedules từ phòng có status maintenance");
        console.log("[MaintenanceManagement] Total rooms loaded:", rooms.length);
        console.log("[MaintenanceManagement] Room statuses:", rooms.map(r => ({ id: r.id, name: r.name, status: r.status })));
        
        const maintenanceRooms = rooms.filter(room => {
          const status = String(room.status || '').toLowerCase();
          const isMaintenance = status === 'maintenance';
          if (isMaintenance) {
            console.log("[MaintenanceManagement] ✅ Found maintenance room:", { id: room.id, name: room.name, status: room.status });
          }
          return isMaintenance;
        });
        
        console.log("[MaintenanceManagement] Maintenance rooms found:", maintenanceRooms.length);
        
        // Tạo mock maintenance schedules từ phòng maintenance
        const fallbackSchedules = maintenanceRooms.map(room => ({
          id: room.id,
          facilityId: room.id,
          facility: {
            id: room.id,
            name: room.name,
            type: room.type
          },
          roomName: room.name,
          startDate: new Date().toISOString(), // Giả sử bắt đầu từ bây giờ
          endDate: null, // Vô thời hạn
          reason: "Phòng đang bảo trì",
          status: "ACTIVE"
        }));
        
        // Merge với schedules hiện tại (nếu có) để không mất schedules đã thêm vào
        setMaintenanceSchedules(prev => {
          // Lấy danh sách facilityId đã có trong prev và từ fallback
          const existingFacilityIds = new Set(prev.map(s => s.facilityId));
          const fallbackFacilityIds = new Set(fallbackSchedules.map(s => s.facilityId));
          
          // Giữ lại TẤT CẢ schedules từ prev mà KHÔNG có trong fallback 
          // (phòng vừa thiết lập có thể chưa được backend update status, nên không có trong rooms với status maintenance)
          const prevSchedulesToKeep = prev.filter(s => {
            const notInFallback = !fallbackFacilityIds.has(s.facilityId);
            if (notInFallback) {
              console.log("[MaintenanceManagement] Keeping schedule (not found in fallback):", s.roomName || s.facility?.name, "facilityId:", s.facilityId);
            }
            return notInFallback;
          });
          
          // Chỉ thêm schedules mới từ fallback (chưa có trong prev)
          const newSchedules = fallbackSchedules.filter(s => !existingFacilityIds.has(s.facilityId));
          
          // Merge: giữ lại schedules từ prev (phòng vừa thiết lập) + schedules từ fallback
          const merged = [...prevSchedulesToKeep, ...fallbackSchedules];
          
          console.log("[MaintenanceManagement] ✅ Merged schedules:", {
            previous: prev.length,
            keptFromPrev: prevSchedulesToKeep.length,
            newFromFallback: newSchedules.length,
            total: merged.length,
            fallbackTotal: fallbackSchedules.length
          });
          
          return merged;
        });
        console.log("[MaintenanceManagement] ✅ Tạo được", fallbackSchedules.length, "maintenance schedules từ phòng");
      } else {
        // API trả về array trực tiếp, không cần .data
        console.log("[MaintenanceManagement] ✅ Loaded", schedulesData.length, "maintenance schedules from API");
        
        // Merge với schedules hiện tại (nếu có) để không mất schedules vừa thêm vào
        setMaintenanceSchedules(prev => {
          const apiSchedules = Array.isArray(schedulesData) ? schedulesData : [];
          const apiFacilityIds = new Set(apiSchedules.map(s => s.facilityId));
          
          // Giữ lại TẤT CẢ schedules từ prev mà KHÔNG có trong API
          // (phòng vừa thiết lập có thể chưa được backend sync, nên không có trong API response)
          const prevSchedulesToKeep = prev.filter(s => {
            const notInAPI = !apiFacilityIds.has(s.facilityId);
            if (notInAPI) {
              console.log("[MaintenanceManagement] Keeping schedule (not found in API):", s.roomName || s.facility?.name, "facilityId:", s.facilityId);
            }
            return notInAPI;
          });
          
          // Nếu có schedules trong API, dùng API data + schedules từ prev (phòng vừa thiết lập)
          const merged = [...apiSchedules, ...prevSchedulesToKeep];
          
          console.log("[MaintenanceManagement] ✅ Merged schedules with API:", {
            fromAPI: apiSchedules.length,
            keptFromPrev: prevSchedulesToKeep.length,
            total: merged.length
          });
          
          return merged;
        });
      }
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
      
      // Tìm phòng vừa thiết lập bảo trì
      const roomJustSet = rooms.find(r => r.id === Number(formData.facilityId));
      
      // Thêm maintenance schedule vào state ngay lập tức (không cần chờ reload)
      if (roomJustSet) {
        const newSchedule = {
          id: result?.id || roomJustSet.id || Date.now(),
          facilityId: Number(formData.facilityId),
          facility: {
            id: roomJustSet.id,
            name: roomJustSet.name,
            type: roomJustSet.type
          },
          roomName: roomJustSet.name,
          startDate: startDate,
          endDate: endDate || null,
          reason: formData.reason.trim(),
          status: "ACTIVE"
        };
        
        console.log("[MaintenanceManagement] ✅ Adding new maintenance schedule to state immediately:", newSchedule);
        setMaintenanceSchedules(prev => {
          // Kiểm tra xem đã có schedule cho phòng này chưa (tránh duplicate)
          const exists = prev.some(s => s.facilityId === Number(formData.facilityId));
          if (exists) {
            console.log("[MaintenanceManagement] Schedule already exists for this room, updating...");
            return prev.map(s => s.facilityId === Number(formData.facilityId) ? newSchedule : s);
          }
          return [...prev, newSchedule];
        });
      }
      
      setFormSuccess(true);
      
      // Reload data sau 1.5 giây để đảm bảo backend đã update status của facility
      // Đồng thời cập nhật lại danh sách từ server
      setTimeout(async () => {
        console.log("[MaintenanceManagement] Reloading data after setting maintenance...");
        await loadData();
        
        // Đợi thêm một chút để đảm bảo data đã được load xong
        setTimeout(() => {
          handleCloseForm();
        }, 300);
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
      const status = String(room.status || "").toLowerCase();
      const isActive = status === "active";
      const isNotInMaintenance = !maintenanceFacilityIds.has(room.id);
      const isNotMaintenanceStatus = status !== "maintenance"; // Loại bỏ phòng có status = maintenance
      return isActive && isNotInMaintenance && isNotMaintenanceStatus;
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

