// src/services/adminService.js
import api from "./api";

// GET /admin/statistics?campusId&dateRange
export const getStatistics = async (campusId, dateRange = "week") => {
  const params = {
    dateRange
  };
  if (campusId !== undefined && campusId !== null) {
    // Đảm bảo campusId là number (Prisma expect Int)
    params.campusId = typeof campusId === 'string' ? parseInt(campusId, 10) : Number(campusId);
  }
  const res = await api.get("/admin/statistics", { params });
  return res.data;
};

// GET /bookings/history?campusId (hoặc /admin/history?campusId)
export const getAllHistory = async (campusId) => {
  try {
    const params = {};
    if (campusId !== undefined && campusId !== null) {
      // Đảm bảo campusId là number (Prisma expect Int)
      params.campusId = typeof campusId === 'string' ? parseInt(campusId, 10) : Number(campusId);
    }
    console.log('[getAllHistory] Calling API with params:', params);
    
    // Thử endpoint /bookings/history trước (booking history)
    let res;
    try {
      res = await api.get("/bookings/history", { params });
      console.log('[getAllHistory] Success from /bookings/history, received:', res.data?.length || 0, 'items');
    } catch (error) {
      const status = error.response?.status;
      // Nếu 404 (not found) hoặc 403 (forbidden), thử endpoint khác
      if (status === 404 || status === 403) {
        console.log(`[getAllHistory] /bookings/history returned ${status}, trying /admin/history...`);
        try {
          res = await api.get("/admin/history", { params });
          console.log('[getAllHistory] Success from /admin/history, received:', res.data?.length || 0, 'items');
        } catch (secondError) {
          // Nếu cả 2 endpoint đều 404/403, trả về empty array
          const secondStatus = secondError.response?.status;
          if (secondStatus === 404 || secondStatus === 403) {
            console.warn(`[getAllHistory] Both endpoints returned ${secondStatus}. User may not have permission or endpoint not available. Returning empty array.`);
            return [];
          }
          throw secondError;
        }
      } else {
        throw error;
      }
    }
    
    // Trả về mảng rỗng nếu data không tồn tại hoặc không phải array
    const data = res.data;
    if (!data) {
      console.log('[getAllHistory] No data returned, returning empty array');
      return [];
    }
    
    // Đảm bảo trả về array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[getAllHistory] Error:', {
      campusId,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    // Xử lý 404 (not found) và 403 (forbidden) - trả về empty array
    const status = error.response?.status;
    if (status === 404 || status === 403) {
      const reason = status === 403 
        ? 'User does not have permission to access this endpoint (403 Forbidden)' 
        : 'API endpoint not found (404 Not Found)';
      console.warn(`[getAllHistory] ${reason}. Returning empty array.`);
      return [];
    }
    // Với các lỗi khác, vẫn trả về empty array để không crash UI
    console.warn('[getAllHistory] Error occurred, returning empty array to prevent UI crash');
    return [];
  }
};

