// src/services/equipmentService.js
import { apiRequest } from "../config/api";

const ensureArray = (data) => (Array.isArray(data) ? data : []);
const assertFacilityId = (facilityId) => {
  if (facilityId === undefined || facilityId === null || facilityId === "") {
    throw new Error("facilityId is required");
  }
  const n = Number(facilityId);
  if (Number.isNaN(n)) throw new Error("facilityId must be a number");
  return n;
};

// GET /equipment/types
export const getEquipmentTypes = async () => {
  try {
    const data = await apiRequest("/equipment/types", { method: "GET" });
    return ensureArray(data);
  } catch (error) {
    console.error("[getEquipmentTypes] Error:", error);
    throw error;
  }
};

// POST /equipment/types
export const createEquipmentType = async (payload) => {
  try {
    const data = await apiRequest("/equipment/types", {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
      headers: { "Content-Type": "application/json" }, // bỏ nếu apiRequest tự set
    });
    return data;
  } catch (error) {
    console.error("[createEquipmentType] Error:", error);
    throw error;
  }
};

/**
 * ✅ GET /equipment/facilities/{facilityId}
 * Backend trả: { facility: {...}, equipment: [...] }
 * -> return { facility, equipment }
 */
export const getEquipmentsByFacility = async (facilityId) => {
  try {
    const id = assertFacilityId(facilityId);
    const data = await apiRequest(`/equipment/facilities/${id}`, { method: "GET" });

    return {
      facility: data?.facility ?? null,
      equipment: ensureArray(data?.equipment),
    };
  } catch (error) {
    console.error("[getEquipmentsByFacility] Error:", error);
    throw error;
  }
};

// POST /equipment/facilities/{facilityId}
export const addEquipmentToFacility = async (facilityId, payload) => {
  try {
    const id = assertFacilityId(facilityId);
    const data = await apiRequest(`/equipment/facilities/${id}`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
      headers: { "Content-Type": "application/json" }, // bỏ nếu apiRequest tự set
    });
    return data;
  } catch (error) {
    console.error("[addEquipmentToFacility] Error:", error);
    throw error;
  }
};
export const updateFacilityEquipment = async (facilityId, equipmentTypeId, condition, payload) => {
  const id = Number(facilityId);
  const typeId = Number(equipmentTypeId);
  const cond = (condition ?? "good").toString().toLowerCase();

  return apiRequest(`/equipment/facilities/${id}/${typeId}/${cond}`, {
    method: "PUT",
    body: JSON.stringify(payload ?? {}),
    headers: { "Content-Type": "application/json" },
  });
};

export const removeFacilityEquipment = async (facilityId, equipmentTypeId, condition) => {
  const id = Number(facilityId);
  const typeId = Number(equipmentTypeId);
  const cond = (condition ?? "good").toString().toLowerCase();

  return apiRequest(`/equipment/facilities/${id}/${typeId}/${cond}`, {
    method: "DELETE",
  });
};
