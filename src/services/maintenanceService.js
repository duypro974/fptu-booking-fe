// src/services/maintenanceService.js
import api from "./api";

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
