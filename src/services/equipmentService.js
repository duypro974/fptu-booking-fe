// src/services/equipmentService.js
import { apiRequest } from "../config/api";

const ensureArray = (data) => (Array.isArray(data) ? data : []);

const assertNumberId = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${fieldName} is required`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${fieldName} must be a number`);
  return n;
};

const normalizeCondition = (condition) => {
  const c = (condition ?? "good").toString().trim().toLowerCase();
  return c === "poor" ? "poor" : "good";
};

/* =========================
 * Equipment Types
 * ========================= */

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
      headers: { "Content-Type": "application/json" },
    });
    return data;
  } catch (error) {
    console.error("[createEquipmentType] Error:", error);
    throw error;
  }
};

/* =========================
 * Facility Equipment
 * ========================= */

/**
 * GET /equipment/facilities/{facilityId}
 * Backend trả: { facility: {...}, equipment: [...] }
 * -> return { facility, equipment }
 */
export const getEquipmentsByFacility = async (facilityId) => {
  try {
    const id = assertNumberId(facilityId, "facilityId");
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
    const id = assertNumberId(facilityId, "facilityId");
    const data = await apiRequest(`/equipment/facilities/${id}`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
      headers: { "Content-Type": "application/json" },
    });
    return data;
  } catch (error) {
    console.error("[addEquipmentToFacility] Error:", error);
    throw error;
  }
};

// PUT /equipment/facilities/{facilityId}/{equipmentTypeId}/{condition}
export const updateFacilityEquipment = async (facilityId, equipmentTypeId, condition, payload) => {
  const id = assertNumberId(facilityId, "facilityId");
  const typeId = assertNumberId(equipmentTypeId, "equipmentTypeId");
  const cond = normalizeCondition(condition);

  return apiRequest(`/equipment/facilities/${id}/${typeId}/${cond}`, {
    method: "PUT",
    body: JSON.stringify(payload ?? {}),
    headers: { "Content-Type": "application/json" },
  });
};

// DELETE /equipment/facilities/{facilityId}/{equipmentTypeId}/{condition}
export const removeFacilityEquipment = async (facilityId, equipmentTypeId, condition) => {
  const id = assertNumberId(facilityId, "facilityId");
  const typeId = assertNumberId(equipmentTypeId, "equipmentTypeId");
  const cond = normalizeCondition(condition);

  return apiRequest(`/equipment/facilities/${id}/${typeId}/${cond}`, {
    method: "DELETE",
  });
};

/**
 * ✅ GET /equipment/facilities/{facilityId}/history?equipmentTypeId=&limit=&offset=
 * IMPORTANT: để đúng yêu cầu "lịch sử của cái nào chỉ của cái đó"
 * => bắt buộc equipmentTypeId, nếu thiếu thì return [] (hoặc throw)
 */
export const getFacilityEquipmentHistory = async (
  facilityId,
  { equipmentTypeId, limit = 50, offset = 0 } = {}
) => {
  const id = assertNumberId(facilityId, "facilityId");

  // ✅ bắt buộc có equipmentTypeId để không lấy ALL lịch sử của phòng
  if (equipmentTypeId === undefined || equipmentTypeId === null || equipmentTypeId === "") {
    // bạn có thể đổi thành throw new Error(...) nếu muốn bắt lỗi rõ ràng
    return [];
  }

  const typeId = assertNumberId(equipmentTypeId, "equipmentTypeId");

  const params = new URLSearchParams();
  params.set("equipmentTypeId", String(typeId));
  params.set("limit", String(Number(limit) || 50));
  params.set("offset", String(Number(offset) || 0));

  const qs = params.toString();

  try {
    const data = await apiRequest(`/equipment/facilities/${id}/history?${qs}`, { method: "GET" });
    return ensureArray(data);
  } catch (error) {
    console.error("[getFacilityEquipmentHistory] Error:", error);
    throw error;
  }
};
