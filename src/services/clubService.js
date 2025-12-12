// src/services/clubService.js
import api from "./api";

export const getClubs = async ({ campusId } = {}) => {
  const res = await api.get("/clubs", { params: campusId ? { campusId } : {} });
  return res.data;
};

export const createClub = async (payload) => (await api.post("/clubs", payload)).data;

export const updateClub = async (id, payload) => (await api.put(`/clubs/${id}`, payload)).data;

export const deleteClub = async (id) => (await api.delete(`/clubs/${id}`)).data;

export const getClubPriorities = async (clubId) => (await api.get(`/clubs/${clubId}/priorities`)).data;

export const addClubPriority = async (clubId, payload) =>
  (await api.post(`/clubs/${clubId}/priorities`, payload)).data;

export const removeClubPriority = async (clubId, facilityId) =>
  (await api.delete(`/clubs/${clubId}/priorities/${facilityId}`)).data;
