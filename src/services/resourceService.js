// src/services/resourceService.js
import api from "./api";

const PREFIX = "/resources";

/* ===== CAMPUSES ===== */
export const getCampuses = async () => (await api.get(`${PREFIX}/campuses`)).data;
export const createCampus = async (payload) => (await api.post(`${PREFIX}/campuses`, payload)).data;
export const updateCampus = async (id, payload) => (await api.put(`${PREFIX}/campuses/${id}`, payload)).data;
export const deleteCampus = async (id) => (await api.delete(`${PREFIX}/campuses/${id}`)).data;

/* ===== FACILITY TYPES ===== */
export const getFacilityTypes = async () => (await api.get(`${PREFIX}/facility-types`)).data;
export const createFacilityType = async (payload) => (await api.post(`${PREFIX}/facility-types`, payload)).data;
export const updateFacilityType = async (id, payload) =>
  (await api.put(`${PREFIX}/facility-types/${id}`, payload)).data;
export const deleteFacilityType = async (id) => (await api.delete(`${PREFIX}/facility-types/${id}`)).data;

/* ===== FACILITIES ===== */
export const getFacilities = async ({ campusId, typeId } = {}) => {
  const params = {};
  if (campusId) params.campusId = campusId;
  if (typeId) params.typeId = typeId;

  // Backend route: GET /facilities (Security Guard có quyền GET)
  // Thử /facilities trước, nếu không được (403/404) thì fallback về /resources/facilities
  try {
    const res = await api.get("/facilities", { params });
    return res.data;
  } catch (err) {
    // Fallback về endpoint cũ nếu endpoint mới không hoạt động (403 Forbidden hoặc 404 Not Found)
    const status = err?.response?.status;
    if (status === 403 || status === 404) {
      console.log(`[getFacilities] ${status} on /facilities, falling back to /resources/facilities`);
      try {
        const res = await api.get(`${PREFIX}/facilities`, { params });
        console.log(`[getFacilities] Fallback successful`);
        return res.data;
      } catch (fallbackErr) {
        console.error(`[getFacilities] Fallback also failed:`, fallbackErr?.response?.status);
        // Nếu cả 2 endpoint đều lỗi, throw lỗi đầu tiên
        throw err;
      }
    }
    throw err;
  }
};

export const getFacilityDetail = async (id) => (await api.get(`${PREFIX}/facilities/${id}`)).data;

export const createFacility = async (payload) => (await api.post(`${PREFIX}/facilities`, payload)).data;
export const updateFacility = async (id, payload) => (await api.put(`${PREFIX}/facilities/${id}`, payload)).data;
export const deleteFacility = async (id) => (await api.delete(`${PREFIX}/facilities/${id}`)).data;
