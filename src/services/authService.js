// src/services/authService.js
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6969/api";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// POST /auth/login
export const login = async ({ email, password, campusId }) => {
  try {
    console.log('[authService.login] ========== START LOGIN ==========');
    console.log('[authService.login] API Base URL:', API_BASE_URL);
    console.log('[authService.login] Full URL:', `${API_BASE_URL}/auth/login`);
    console.log('[authService.login] Request details:', {
      email,
      passwordLength: password?.length,
      campusId,
      campusIdType: typeof campusId,
      campusIdValue: campusId
    });

    const payload = { email, password, campusId: Number(campusId) };
    console.log('[authService.login] Payload (sanitized):', { 
      email: payload.email, 
      password: '***', 
      campusId: payload.campusId,
      campusIdType: typeof payload.campusId
    });
    
    const res = await axiosClient.post("/auth/login", payload);
    
    console.log('[authService.login] ✅ SUCCESS:', {
      status: res.status,
      hasToken: !!res.data?.token,
      hasUser: !!res.data?.user,
      userRole: res.data?.user?.role,
      userEmail: res.data?.user?.email
    });

    // Nếu backend trả token: lưu lại để dùng Bearer (tuỳ bạn)
    if (res.data?.token) {
      localStorage.setItem("access_token", res.data.token);
      console.log('[authService.login] Token saved to localStorage');
    }

    // Nếu bạn cần lưu user:
    if (res.data?.user) {
      localStorage.setItem("fptu_user", JSON.stringify(res.data.user));
      console.log('[authService.login] User saved to localStorage');
    }

    return res.data; // { message, token, user }
  } catch (error) {
    console.error('[authService.login] ❌ ERROR DETAILS:', {
      // Network errors
      isNetworkError: !error.response,
      message: error.message,
      code: error.code,
      
      // Response errors
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      
      // Request details
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      method: error.config?.method,
      payload: error.config?.data ? JSON.parse(error.config.data) : null
    });
    
    // Xử lý các loại lỗi khác nhau
    if (!error.response) {
      // Network error (không kết nối được backend)
      const networkError = new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc liên hệ quản trị viên.');
      networkError.isNetworkError = true;
      throw networkError;
    }
    
    if (error.response?.status === 401) {
      const backendMessage = error.response?.data?.message || error.response?.data?.error || 'Email hoặc mật khẩu không đúng';
      throw new Error(backendMessage);
    }
    
    if (error.response?.status === 500) {
      throw new Error('Lỗi server. Vui lòng thử lại sau.');
    }
    
    // Lỗi khác
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Đăng nhập thất bại';
    throw new Error(errorMessage);
  }
};

// GET /auth/profile
export const getProfile = async () => {
  const res = await axiosClient.get("/auth/profile");
  return res.data;
};

// (Optional) Google login redirect
export const googleLoginUrl = (campusId) => {
  const base = import.meta.env.VITE_API_URL || "http://localhost:6969/api";
  return `${base}/auth/google/login?campusId=${campusId}`;
};
