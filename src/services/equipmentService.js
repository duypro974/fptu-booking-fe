// src/services/equipmentService.js
import api from "./api";

// GET /equipment/types - Danh sách loại thiết bị
export const getEquipmentTypes = async () => {
  try {
    const res = await api.get("/equipment/types");
    return res.data; // EquipmentType[]
  } catch (error) {
    console.error('[getEquipmentTypes] Error:', error);
    throw error;
  }
};

// POST /equipment/types - Tạo loại thiết bị mới
export const createEquipmentType = async (payload) => {
  try {
    const res = await api.post("/equipment/types", payload);
    return res.data; // EquipmentType
  } catch (error) {
    console.error('[createEquipmentType] Error:', error);
    throw error;
  }
};

// POST /equipment/facilities/{facilityId} - Thêm thiết bị vào phòng
export const addEquipmentToFacility = async (facilityId, payload) => {
  try {
    const res = await api.post(`/equipment/facilities/${facilityId}`, payload);
    return res.data; // Equipment
  } catch (error) {
    console.error('[addEquipmentToFacility] Error:', error);
    throw error;
  }
};

