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

// GET /bookings/search - Lấy danh sách phòng trống hiện tại (theo thời gian thực)
export const getAvailableFacilities = async (campusId) => {
  try {
    // Lấy date hôm nay (YYYY-MM-DD)
    const today = new Date();
    const date = today.toISOString().split('T')[0];
    
    // Tính slot hiện tại dựa vào giờ
    const currentHour = today.getHours();
    let currentSlot = 1; // Default slot 1
    
    // Slot mapping: 1 (7-9), 2 (9-11), 3 (11-13), 4 (13-15), 5 (15-17)
    if (currentHour >= 7 && currentHour < 9) currentSlot = 1;
    else if (currentHour >= 9 && currentHour < 11) currentSlot = 2;
    else if (currentHour >= 11 && currentHour < 13) currentSlot = 3;
    else if (currentHour >= 13 && currentHour < 15) currentSlot = 4;
    else if (currentHour >= 15 && currentHour < 17) currentSlot = 5;
    else {
      // Ngoài giờ học (trước 7h hoặc sau 17h), lấy slot tiếp theo hoặc slot cuối
      if (currentHour < 7) currentSlot = 1;
      else currentSlot = 5;
    }
    
    console.log('[getAvailableFacilities] Calling with:', { date, slot: currentSlot, campusId });
    
    // Gọi API search available rooms
    // Lưu ý: API /bookings/search có thể không hỗ trợ campusId trực tiếp
    // Nếu cần, có thể filter client-side sau khi nhận response
    const availableRooms = await api.searchAvailableRooms({
      date: date,
      slot: currentSlot
    });
    
    console.log('[getAvailableFacilities] Received raw:', availableRooms?.length || 0, 'available rooms');
    console.log('[getAvailableFacilities] Sample room data:', availableRooms?.[0]);
    
    // Filter theo campusId nếu có (client-side)
    // Vì API có thể trả về tất cả phòng, cần filter theo campus
    let filteredRooms = availableRooms;
    if (campusId && Array.isArray(availableRooms) && availableRooms.length > 0) {
      // Map campusId sang campus string để so sánh
      const campusMap = { 1: 'hn', 2: 'hcm', 3: 'dn', 4: 'ct', 5: 'qn' };
      const campusString = campusMap[campusId] || null;
      
      filteredRooms = availableRooms.filter(room => {
        // Kiểm tra nhiều format: room.campus, room.campusId, room.facility?.campusId
        const roomCampusId = room.campusId || room.facility?.campusId || room.facilityId;
        const roomCampus = room.campus || (roomCampusId ? campusMap[roomCampusId] : null);
        
        const matches = roomCampusId === campusId || roomCampus === campusString;
        if (!matches && roomCampusId) {
          console.log('[getAvailableFacilities] Filtered out room:', room.name || room.id, 'campusId:', roomCampusId, 'expected:', campusId);
        }
        return matches;
      });
      
      console.log('[getAvailableFacilities] Filtered by campusId', campusId, ':', filteredRooms.length, 'rooms (from', availableRooms.length, 'total)');
    }
    
    console.log('[getAvailableFacilities] Final filtered rooms:', filteredRooms);
    
    // Trả về array các facility IDs hoặc array đầy đủ
    return Array.isArray(filteredRooms) ? filteredRooms : [];
  } catch (error) {
    console.error('[getAvailableFacilities] Error:', error);
    // Nếu lỗi, trả về empty array để không crash UI
    const status = error.response?.status;
    if (status === 404 || status === 403 || status === 401) {
      console.warn('[getAvailableFacilities] API returned', status, '- returning empty array');
      return [];
    }
    // Với các lỗi khác, vẫn trả về empty array để không crash
    console.warn('[getAvailableFacilities] Error occurred, returning empty array to prevent UI crash');
    return [];
  }
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

