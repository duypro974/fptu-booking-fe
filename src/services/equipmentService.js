// src/services/equipmentService.js
import { apiRequest } from '../config/api';

// GET /equipment/types - [SW1] Danh sách loại thiết bị
export const getEquipmentTypes = async () => {
  try {
    const data = await apiRequest('/equipment/types');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[getEquipmentTypes] Error:', error);
    throw error;
  }
};

// POST /equipment/types - [SW1] Tạo loại thiết bị mới
export const createEquipmentType = async (payload) => {
  try {
    const data = await apiRequest('/equipment/types', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  } catch (error) {
    console.error('[createEquipmentType] Error:', error);
    throw error;
  }
};

// POST /equipment/facilities/{facilityId} - [SW1] Thêm thiết bị vào phòng
export const addEquipmentToFacility = async (facilityId, payload) => {
  try {
    const data = await apiRequest(`/equipment/facilities/${facilityId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  } catch (error) {
    console.error('[addEquipmentToFacility] Error:', error);
    throw error;
  }
};
