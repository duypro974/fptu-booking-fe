// src/services/userService.js
import api from "./api";

// GET /users - Danh sách nhân sự/người dùng
export const getUsers = async (filters = {}) => {
  try {
    const { campusId, role, status, searchQuery } = filters;
    const params = new URLSearchParams();
    
    if (campusId) params.append('campusId', campusId);
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    if (searchQuery) params.append('search', searchQuery);
    
    const queryString = params.toString();
    const res = await api.get(`/users${queryString ? `?${queryString}` : ''}`);
    return res.data; // User[]
  } catch (error) {
    console.error('[getUsers] Error:', error);
    throw error;
  }
};

// PATCH /users/{id}/status - Khóa/Mở khóa tài khoản
export const updateUserStatus = async (userId, status) => {
  try {
    const res = await api.patch(`/users/${userId}/status`, { status });
    return res.data; // User
  } catch (error) {
    console.error('[updateUserStatus] Error:', error);
    throw error;
  }
};

// PATCH /users/update-profile
export const updateProfile = async ({ fullName, phoneNumber }) => {
  const res = await api.patch("/users/update-profile", { fullName, phoneNumber });
  return res.data; // User
};

// PATCH /users/change-password
export const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const res = await api.patch("/users/change-password", {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  return res.data; // { message: "..." }
};
