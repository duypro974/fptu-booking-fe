// src/services/api.js
import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:6969/api",
  
  headers: { "Content-Type": "application/json" },
});

// Bearer token (nếu có)
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response unwrap + error normalize
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default axiosClient;

// ✅ thêm named export `api` để các file import { api } không bị crash
export const api = axiosClient;
