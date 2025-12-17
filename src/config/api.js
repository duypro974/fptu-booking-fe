// API Configuration
// Tự động thêm /api nếu URL từ env không có /api ở cuối
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:6969';
  // Nếu URL không kết thúc bằng /api, thêm /api vào
  if (!envUrl.endsWith('/api')) {
    const finalUrl = envUrl.endsWith('/') ? `${envUrl}api` : `${envUrl}/api`;
    console.log(`[API Config] Auto-added /api to URL: ${envUrl} -> ${finalUrl}`);
    return finalUrl;
  }
  console.log(`[API Config] Using API URL: ${envUrl}`);
  return envUrl;
};

export const API_BASE_URL = getBaseUrl();

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
    // Log token info (không log toàn bộ token vì bảo mật)
    console.log('[apiRequest] Token found, length:', token.length, 'first 10 chars:', token.substring(0, 10) + '...');
  } else {
    console.warn('[apiRequest] ⚠️ No token found in localStorage!');
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
        console.error('[apiRequest] 403 Forbidden - Token có thể không hợp lệ hoặc không có quyền');
        console.error('[apiRequest] Endpoint:', endpoint);
        console.error('[apiRequest] Token exists:', !!token);
        
        const errorData = await response.json().catch(() => ({ message: 'Bạn không có quyền thực hiện thao tác này.' }));
        const errorMessage = errorData.message || 'Bạn không có quyền thực hiện thao tác này.';
        
        // Chỉ clear token và redirect nếu error message chỉ ra là lỗi authentication
        // Nếu chỉ là lỗi permission (không có quyền), không redirect
        if (errorMessage.includes('Token') || errorMessage.includes('token') || errorMessage.includes('đăng nhập lại')) {
          // Clear token và user data
          localStorage.removeItem('fptu_user');
          localStorage.removeItem('access_token');
          
          // Redirect về login nếu đang ở client-side
          if (typeof window !== 'undefined') {
            // Chỉ redirect nếu không phải đang ở trang login
            if (!window.location.pathname.includes('/login')) {
              console.warn('[apiRequest] Redirecting to login due to 403 authentication error');
              window.location.href = '/login';
            }
          }
        }
        
        throw new Error(errorMessage);
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

