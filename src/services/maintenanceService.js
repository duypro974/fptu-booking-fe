// src/services/maintenanceService.js
import api from "./api";

// GET /maintenance/check-impact - Kiểm tra va chạm trước khi bảo trì
export const checkMaintenanceImpact = async ({ facilityId, startDate, endDate }) => {
  try {
    const params = new URLSearchParams();
    params.append('facilityId', facilityId);
    params.append('startDate', startDate);
    if (endDate) {
      params.append('endDate', endDate);
    }
    
    const res = await api.get(`/maintenance/check-impact?${params.toString()}`);
    return res.data; // { conflicts: [...], canProceed: boolean }
  } catch (error) {
    console.error('[checkMaintenanceImpact] Error:', error);
    throw error;
  }
};

// POST /maintenance/set - Thiết lập Bảo trì & Auto chuyển phòng
export const setMaintenance = async ({ facilityId, startDate, endDate, reason }) => {
  const res = await api.post("/maintenance/set", {
    facilityId,
    startDate,
    endDate: endDate || null,
    reason,
  });
  return res.data; // MaintenanceSetResponse
};
