// src/services/authService.js
import api from "./api";

// POST /auth/login
export const login = async ({ email, password, campusId }) => {
  const res = await api.post("/auth/login", { email, password, campusId });

  // Nếu backend trả token: lưu lại để dùng Bearer (tuỳ bạn)
  if (res.data?.token) localStorage.setItem("access_token", res.data.token);

  // Nếu bạn cần lưu user:
  if (res.data?.user) localStorage.setItem("fptu_user", JSON.stringify(res.data.user));

  return res.data; // { message, token, user }
};

// GET /auth/profile
export const getProfile = async () => {
  const res = await api.get("/auth/profile");
  return res.data;
};

// (Optional) Google login redirect
export const googleLoginUrl = (campusId) => {
  const base = import.meta.env.VITE_API_URL || "http://localhost:6969/api";
  return `${base}/auth/google/login?campusId=${campusId}`;
};
