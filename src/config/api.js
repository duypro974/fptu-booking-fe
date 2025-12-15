// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:6969/api';

// Import để dùng trong api.js
export { API_BASE_URL as API_BASE_URL_EXPORT };

// Helper function để lấy token từ localStorage
export const getAuthToken = () => {
  // Token được lưu riêng trong 'access_token' (theo authService.js)
  return localStorage.getItem('access_token');
};

// Helper function để gọi API với authentication
export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Thêm timeout 30 giây
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    // Sử dụng cache: 'no-cache' và headers để tránh 304 Not Modified
    // Không thêm _t vào query string vì backend sẽ parse vào Prisma where clause
    console.log('[apiRequest] Calling:', `${API_BASE_URL}${endpoint}`, 'with token:', token ? 'Yes' : 'No');
    
    // Thêm headers để tránh cache
    const cacheHeaders = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...headers,
        ...cacheHeaders,
      },
      // Thêm cache control để tránh cache (chuẩn HTTP, không cần query param)
      cache: 'no-cache',
    });
    
    clearTimeout(timeoutId);
    console.log('[apiRequest] Response status:', response.status, response.statusText);

    // Xử lý lỗi
    if (!response.ok) {
      if (response.status === 401) {
        // Token hết hạn hoặc không hợp lệ - clear localStorage
        localStorage.removeItem('fptu_user');
        localStorage.removeItem('access_token');
        // Không cần reload, AuthContext sẽ tự detect và redirect
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      
      if (response.status === 403) {
        // Token không hợp lệ hoặc không có quyền
        const errorData = await response.json().catch(() => ({ message: 'Token không hợp lệ hoặc đã hết hạn.' }));
        throw new Error(errorData.message || 'Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại.');
      }
      
      const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Nếu bị abort do timeout
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT_ERROR: Request timeout sau 30 giây. Vui lòng thử lại.');
    }
    
    // Nếu lỗi kết nối (ERR_CONNECTION_REFUSED, network error), throw error đặc biệt
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('CONNECTION_ERROR: Backend không khả dụng. Vui lòng kiểm tra backend có đang chạy không.');
    }
    throw error;
  }
};

