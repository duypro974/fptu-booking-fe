// src/services/resourceService.js
import api from "./api";

/* ===== CAMPUSES ===== */
export const getCampuses = async () => (await api.get("/campuses")).data;

export const createCampus = async (payload) => (await api.post("/campuses", payload)).data;

export const updateCampus = async (id, payload) => (await api.put(`/campuses/${id}`, payload)).data;

export const deleteCampus = async (id) => (await api.delete(`/campuses/${id}`)).data;

/* ===== FACILITY TYPES ===== */
export const getFacilityTypes = async () => (await api.get("/facility-types")).data;

export const createFacilityType = async (payload) => (await api.post("/facility-types", payload)).data;

export const updateFacilityType = async (id, payload) => (await api.put(`/facility-types/${id}`, payload)).data;

export const deleteFacilityType = async (id) => (await api.delete(`/facility-types/${id}`)).data;

/* ===== FACILITIES ===== */
export const getFacilities = async ({ campusId, typeId } = {}) => {
  const params = {};
  if (campusId) params.campusId = campusId;
  if (typeId) params.typeId = typeId;

  const res = await api.get("/facilities", { params });
  return res.data;
};

export const createFacility = async (payload) => (await api.post("/facilities", payload)).data;

export const updateFacility = async (id, payload) => (await api.put(`/facilities/${id}`, payload)).data;

export const deleteFacility = async (id) => (await api.delete(`/facilities/${id}`)).data;
