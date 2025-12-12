// src/services/userService.js
import api from "./api";

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
