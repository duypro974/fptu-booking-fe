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
  // Thử /facilities trước, nếu không được thì fallback về /resources/facilities
  try {
    const res = await api.get("/facilities", { params });
    return res.data;
  } catch (err) {
    // Fallback về endpoint cũ nếu endpoint mới không hoạt động
    if (err?.response?.status === 404) {
      const res = await api.get(`${PREFIX}/facilities`, { params });
      return res.data;
    }
    throw err;
  }
};

export const getFacilityDetail = async (id) => (await api.get(`${PREFIX}/facilities/${id}`)).data;

export const createFacility = async (payload) => (await api.post(`${PREFIX}/facilities`, payload)).data;
export const updateFacility = async (id, payload) => (await api.put(`${PREFIX}/facilities/${id}`, payload)).data;
export const deleteFacility = async (id) => (await api.delete(`${PREFIX}/facilities/${id}`)).data;
