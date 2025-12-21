// src/services/maintenanceService.js
import api from "./api";
import { apiRequest } from "../config/api";

// POST /maintenance/set
export const setMaintenance = async ({ facilityId, startDate, endDate, reason }) => {
  const res = await api.post("/maintenance/set", {
    facilityId,
    startDate,
    endDate: endDate || null,
    reason,
  });
  return res.data; // MaintenanceSetResponse
};

// GET /maintenance - Lấy danh sách maintenance schedules
export const getMaintenanceSchedules = async () => {
  try {
    const data = await apiRequest('/maintenance');
    return Array.isArray(data) ? data : (data?.data || []);
  } catch (error) {
    console.error('[getMaintenanceSchedules] Error:', error);
    // Nếu 404, trả về empty array (API có thể chưa có hoặc chưa implement)
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      console.warn('[getMaintenanceSchedules] API /maintenance not found, returning empty array');
      return [];
    }
    throw error;
  }
};
