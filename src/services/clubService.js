// src/services/clubService.js
import api from "./api";
import { apiRequest } from '../config/api';

export const getClubs = async ({ campusId } = {}) => {
  const res = await api.get("/clubs", { params: campusId ? { campusId } : {} });
  return res.data;
};

export const createClub = async (payload) => {
  try {
    const data = await apiRequest('/clubs', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  } catch (error) {
    console.error('[createClub] Error:', error);
    throw error;
  }
};

export const updateClub = async (id, payload) => {
  try {
    const data = await apiRequest(`/clubs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return data;
  } catch (error) {
    console.error('[updateClub] Error:', error);
    throw error;
  }
};

export const deleteClub = async (id) => {
  try {
    const data = await apiRequest(`/clubs/${id}`, {
      method: 'DELETE'
    });
    return data;
  } catch (error) {
    console.error('[deleteClub] Error:', error);
    throw error;
  }
};

export const getClubPriorities = async (clubId) => {
  try {
    const data = await apiRequest(`/clubs/${clubId}/priorities`);
    return data;
  } catch (error) {
    console.error('[getClubPriorities] Error:', error);
    throw error;
  }
};

export const addClubPriority = async (clubId, payload) => {
  try {
    const data = await apiRequest(`/clubs/${clubId}/priorities`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  } catch (error) {
    console.error('[addClubPriority] Error:', error);
    throw error;
  }
};

export const removeClubPriority = async (clubId, facilityId) => {
  try {
    const data = await apiRequest(`/clubs/${clubId}/priorities/${facilityId}`, {
      method: 'DELETE'
    });
    return data;
  } catch (error) {
    console.error('[removeClubPriority] Error:', error);
    throw error;
  }
};

// GET /clubs/:id - Lấy thông tin chi tiết club (bao gồm leaders)
export const getClubDetail = async (clubId) => {
  try {
    const data = await apiRequest(`/clubs/${clubId}`);
    return data;
  } catch (error) {
    console.error('[getClubDetail] Error:', error);
    throw error;
  }
};

// POST /clubs/:id/leaders - Thêm leader cho club
// Payload: { email: string } hoặc { studentId: number } - cần xác nhận với backend
export const addClubLeader = async (clubId, payload) => {
  try {
    const data = await apiRequest(`/clubs/${clubId}/leaders`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  } catch (error) {
    console.error('[addClubLeader] Error:', error);
    throw error;
  }
};

// DELETE /clubs/:id/leaders/:studentId - Xóa leader khỏi club
export const removeClubLeader = async (clubId, studentId) => {
  try {
    const data = await apiRequest(`/clubs/${clubId}/leaders/${studentId}`, {
      method: 'DELETE'
    });
    return data;
  } catch (error) {
    console.error('[removeClubLeader] Error:', error);
    throw error;
  }
};