/* eslint-disable no-unused-vars */
// src/services/api.js

import axios from "axios";
import { apiRequest } from '../config/api';

// ========== CONFIGURATION ==========
// API Mode: REAL API ONLY (Mock đã được loại bỏ)
console.log(`[API Config] Using REAL API`);

// Tạo axios instance để các service khác dùng (api.get, api.post, etc.)
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:6969/api",
  headers: { "Content-Type": "application/json" },
});

// Bearer token interceptor
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

// Helper: Map campus string (hcm, hn) sang campusId number cho backend
const getCampusId = (campus) => {
  if (typeof campus === 'number') return campus;
  const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
  return campusMap[campus?.toLowerCase()] || null;
};

// Object với các methods dùng apiRequest (cho ApprovalList, etc.)
export const api = {
  getCampuses: () => [
    { id: "hcm", name: "FPTU TP.HCM (Quận 9)" },
    { id: "hn", name: "FPTU Hòa Lạc (Hà Nội)" },
  ],

  // ========== BOOKING APIs (MW1) ==========
  // Note: Authentication được xử lý trong authService.js (POST /auth/login, GET /auth/profile)
  
  // GET /facility-types - Lấy danh sách loại phòng
  getFacilityTypes: async () => {
    try {
      const types = await apiRequest('/facility-types');
      return types.map(t => ({
        id: t.id,
        name: t.name,
        code: t.code || t.name.toUpperCase(),
      }));
    } catch (error) {
      console.error('[getFacilityTypes] Error:', error);
      throw error;
    }
  },

  // GET /resources/facilities - Xem danh sách phòng (Campus của tôi)
  getRooms: async (filters = {}) => {
    const { campusId, facilityTypeId, minCapacity, maxCapacity, searchQuery, includeInactive, allStatuses } = filters;
    
    try {
      const params = new URLSearchParams();
      if (facilityTypeId) params.append('typeId', facilityTypeId);
      if (campusId) params.append('campusId', campusId);
      if (includeInactive) params.append('includeInactive', 'true');
      if (allStatuses) params.append('allStatuses', 'true');
      
      const endpoint = `/resources/facilities${params.toString() ? '?' + params.toString() : ''}`;
      console.log('[getRooms] Calling endpoint:', endpoint);
      const facilities = await apiRequest(endpoint);
      
      console.log('[getRooms] Received facilities:', facilities?.length || 0);
      
      let filtered = (facilities || []).map(f => {
        // Lấy ảnh đầu tiên từ imageUrls array, fallback về imageUrl, cuối cùng dùng default
        const imageUrl = f.imageUrls?.[0] || f.imageUrl || "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600";
        
        // Map status từ backend (ACTIVE/INACTIVE/MAINTENANCE) sang frontend (active/inactive/maintenance)
        let status = 'inactive'; // default
        if (f.status === 'ACTIVE') {
          status = 'active';
        } else if (f.status === 'INACTIVE') {
          status = 'inactive';
        } else if (f.status === 'MAINTENANCE' || f.status === 'maintenance') {
          status = 'maintenance';
        }
        
        return {
          id: f.id,
          campus: f.campusId === 1 ? 'hn' : (f.campusId === 2 ? 'hcm' : 'other'),
          name: f.name,
          type: f.type?.name || f.facilityType?.name || 'Unknown',
          typeId: f.typeId || f.facilityTypeId || f.type?.id,
          capacity: f.capacity,
          status: status, // Đã map sang lowercase
          facilityStatus: f.status === 'ACTIVE' ? 'available' : (f.status === 'INACTIVE' ? 'unavailable' : 'maintenance'),
          image: imageUrl,
          building: f.building || 'Unknown',
          floor: f.floor || 0
        };
      });
      
      if (minCapacity) filtered = filtered.filter(room => room.capacity >= minCapacity);
      if (maxCapacity) filtered = filtered.filter(room => room.capacity <= maxCapacity);
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(room => 
          room.name.toLowerCase().includes(query) || room.building.toLowerCase().includes(query)
        );
      }
      
      // Chỉ filter maintenance nếu không yêu cầu allStatuses
      if (!allStatuses) {
        filtered = filtered.filter(room => room.facilityStatus !== 'maintenance');
      }
      
      console.log('[getRooms] Filtered rooms:', filtered.length);
      return filtered;
    } catch (error) {
      console.error('[getRooms] Error:', error);
      throw error;
    }
  },

  // GET /resources/facilities/{id} - Xem chi tiết 1 phòng
  getFacilityDetail: async (facilityId) => {
    try {
      const facility = await apiRequest(`/resources/facilities/${facilityId}`);
      
      // Map theo response từ backend:
      // { id, name, capacity, imageUrls, status, description, campusId, typeId, type: { id, name, ... }, campus: { ... }, equipment: [...] }
      return {
        id: facility.id,
        name: facility.name,
        type: facility.type?.name || 'Unknown',
        typeId: facility.typeId || facility.type?.id,
        capacity: facility.capacity,
        status: facility.status,
        description: facility.description || '',
        images: facility.imageUrls || [],
        equipment: facility.equipment?.map(e => e.name || e) || [], // equipment là array, có thể là objects hoặc strings
        campusId: facility.campusId,
        campus: facility.campus
      };
    } catch (error) {
      console.error('[getFacilityDetail] Error:', error);
      throw error;
    }
  },

  // POST /resources/facilities - Tạo phòng mới
  createRoom: async (payload) => {
    try {
      console.log('[api.createRoom] Payload:', payload);
      const data = await apiRequest('/resources/facilities', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return data;
    } catch (error) {
      console.error('[api.createRoom] Error:', error);
      throw error;
    }
  },

  // PUT /resources/facilities/{id} - Cập nhật phòng
  updateRoom: async (id, payload) => {
    try {
      console.log('[api.updateRoom] ID:', id, 'Payload:', payload);
      const data = await apiRequest(`/resources/facilities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      return data;
    } catch (error) {
      console.error('[api.updateRoom] Error:', error);
      throw error;
    }
  },

  // DELETE /resources/facilities/{id} - Xóa phòng
  deleteRoom: async (id) => {
    try {
      console.log('[api.deleteRoom] ID:', id);
      const data = await apiRequest(`/resources/facilities/${id}`, {
        method: 'DELETE'
      });
      return data;
    } catch (error) {
      console.error('[api.deleteRoom] Error:', error);
      throw error;
    }
  },

  // GET /bookings/search - Tìm phòng trống (MW1)
  searchAvailableRooms: async ({ date, slot, typeId, capacity }) => {
    try {
      const params = new URLSearchParams();
      params.append('date', date);
      params.append('slot', slot);
      if (typeId) params.append('typeId', typeId);
      if (capacity) params.append('capacity', capacity);
      
      const rooms = await apiRequest(`/bookings/search?${params.toString()}`);
      return rooms;
    } catch (error) {
      console.error('[searchAvailableRooms] Error:', error);
      throw error;
    }
  },

  // Lấy lịch biểu của phòng (theo ngày)
  // TODO: API này chưa có endpoint từ backend, cần implement sau
  getRoomSchedule: async (facilityId, date, viewType = "day") => {
    throw new Error('getRoomSchedule API chưa được implement - cần backend endpoint');
  },

  // POST /bookings - Tạo Booking (Đặt lẻ / Đặt CLB)
  createBooking: async (data) => {
    try {
      const payload = {
        facilityId: data.facilityId,
        date: data.date,
        slots: data.slotIds, // Backend expects array of slot numbers
        bookingTypeId: data.isEvent ? 2 : 1, // 1: Normal, 2: Event
        purpose: data.purpose,
        attendeeCount: data.participants
      };

      console.log('[createBooking] Request payload:', payload);
      
      const response = await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log('[createBooking] Response:', response);
      
      return {
        success: true,
        bookingId: response.id,
        bookingCode: response.bookingCode || `BK-${response.id}`,
        message: "Yêu cầu đặt phòng đã được gửi thành công"
      };
    } catch (error) {
      console.error('[createBooking] Error:', error);
      console.error('[createBooking] Error details:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  // GET /clubs - Xem danh sách CLB
  getClubs: async (campusId = null) => {
    try {
      // Tạo params để lấy HẾT tất cả clubs (bỏ phân trang hoặc tăng limit lên)
      const params = new URLSearchParams();
      if (campusId) {
        params.append('campusId', campusId);
      }
      // Thêm limit lớn để lấy hết tất cả clubs (hoặc bỏ phân trang)
      params.append('limit', '1000'); // Lấy tối đa 1000 clubs
      // Nếu backend hỗ trợ, có thể thêm: params.append('all', 'true');
      
      const queryString = params.toString();
      const clubs = await apiRequest(`/clubs${queryString ? `?${queryString}` : ''}`);
      console.log('[getClubs] Raw clubs data:', clubs);
      console.log('[getClubs] Total clubs received:', clubs?.length || 0);
      
      // QUAN TRỌNG: Dùng spread operator ...c TRƯỚC để giữ lại TOÀN BỘ dữ liệu gốc
      // Sau đó mới map/override các field cụ thể nếu cần (KHÔNG ghi đè các field gốc)
      return clubs.map(c => ({
        ...c, // Giữ nguyên TẤT CẢ dữ liệu gốc từ backend (id, name, code, description, campusId, leaderEmail, leaderId, leader, leaders, etc.)
        // Chỉ map/override các field cần thiết (KHÔNG ghi đè các field gốc)
        description: c.description || '',
        campus: c.campusId === 1 ? 'hn' : (c.campusId === 2 ? 'hcm' : 'other')
      }));
    } catch (error) {
      console.error('[getClubs] Error:', error);
      throw error;
    }
  },

  // GET /clubs/{id}/priorities - Xem phòng ưu tiên của CLB
  getClubPriorityRooms: async (clubId) => {
    try {
      const priorities = await apiRequest(`/clubs/${clubId}/priorities`);
      console.log('[getClubPriorityRooms] Raw priorities for club', clubId, ':', priorities);
      console.log('[getClubPriorityRooms] Raw priorities count:', priorities?.length || 0);
      
      // Giữ nguyên format từ backend, chỉ map cơ bản
      // Backend trả về: [{ facilityId, facility: { id, name, ... } }]
      const mapped = priorities.map(p => {
        const facilityId = p.facilityId || p.id || p.facility?.id;
        const name = p.facility?.name || p.name || p.facilityName || null;
        return {
          id: facilityId,
          name: name,
          facilityId: facilityId,
          facility: p.facility, // Giữ nguyên facility object để dùng sau
          isPriority: true,
          // Giữ nguyên tất cả các field khác từ backend
          ...p
        };
      });
      
      console.log('[getClubPriorityRooms] Mapped priorities count:', mapped.length);
      return mapped;
    } catch (error) {
      console.error('[getClubPriorityRooms] Error:', error);
      throw error;
    }
  },

  // POST /clubs - Tạo CLB mới
  createClub: async (payload) => {
    try {
      console.log('[api.createClub] Payload:', payload);
      const data = await apiRequest('/clubs', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return data;
    } catch (error) {
      console.error('[api.createClub] Error:', error);
      throw error;
    }
  },

  // PUT /clubs/{id} - Cập nhật CLB
  updateClub: async (id, payload) => {
    try {
      console.log('[api.updateClub] ID:', id, 'Payload:', payload);
      const data = await apiRequest(`/clubs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      return data;
    } catch (error) {
      console.error('[api.updateClub] Error:', error);
      throw error;
    }
  },

  // DELETE /clubs/{id} - Xóa CLB
  deleteClub: async (id) => {
    try {
      console.log('[api.deleteClub] ID:', id);
      const data = await apiRequest(`/clubs/${id}`, {
        method: 'DELETE'
      });
      return data;
    } catch (error) {
      console.error('[api.deleteClub] Error:', error);
      throw error;
    }
  },

  // ========== MY BOOKINGS ==========
  // TODO: API này chưa có endpoint từ backend, cần implement sau
  getMyBookings: async (userId) => {
    throw new Error('getMyBookings API chưa được implement - cần backend endpoint');
  },

  // TODO: API này chưa có endpoint từ backend, cần implement sau
  cancelBooking: async (bookingId, reason) => {
    throw new Error('cancelBooking API chưa được implement - cần backend endpoint');
  },

  // ========== ADMIN APIs ==========
  // GET /bookings/pending-approvals?campusId
  getPendingApprovals: async (campus) => {
    try {
      const campusId = getCampusId(campus);
      const params = campusId ? `?campusId=${campusId}` : '';
      const data = await apiRequest(`/bookings/pending-approvals${params}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[getPendingApprovals] Error:', error);
      // Nếu 404, trả về empty array
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        return [];
      }
      throw error;
    }
  },

  // GET /bookings/conflicts?campusId - Xem các đơn bị xung đột lịch (tất cả)
  getAllConflicts: async (campus) => {
    try {
      const campusId = getCampusId(campus);
      const params = campusId ? `?campusId=${campusId}` : '';
      const data = await apiRequest(`/bookings/conflicts${params}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[getAllConflicts] Error:', error);
      // Nếu 404, trả về empty array
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        return [];
      }
      throw error;
    }
  },

  // GET /bookings/conflicts?campusId - Xem conflicts của một booking cụ thể
  // Lưu ý: Backend chỉ có endpoint /bookings/conflicts (lấy tất cả), không có /bookings/{id}/conflicts
  // Nên cần gọi /bookings/conflicts và filter theo bookingId client-side
  checkBookingConflicts: async (bookingId, campus) => {
    try {
      const campusId = getCampusId(campus);
      const params = campusId ? `?campusId=${campusId}` : '';
      // Gọi endpoint đúng: /bookings/conflicts (không có {id} trong path)
      const allConflicts = await apiRequest(`/bookings/conflicts${params}`);
      const conflictsArray = Array.isArray(allConflicts) ? allConflicts : [];
      
      // Filter conflicts liên quan đến booking này
      // Conflict có thể có bookingId, facilityId, hoặc các field khác để match
      const relatedConflicts = conflictsArray.filter(conflict => {
        // Kiểm tra nếu conflict liên quan đến booking này
        // Có thể match theo: id, bookingId, facilityId, startTime, endTime
        return conflict.id === bookingId || 
               conflict.bookingId === bookingId ||
               (conflict.facilityId && conflict.facilityId === bookingId);
      });
      
      console.log('[checkBookingConflicts] Found', relatedConflicts.length, 'conflicts for booking', bookingId, 'out of', conflictsArray.length, 'total conflicts');
      return relatedConflicts;
    } catch (error) {
      console.error('[checkBookingConflicts] Error:', error);
      // Nếu 404 hoặc bất kỳ lỗi nào, trả về empty array (không có conflict)
      // Không throw error để không chặn logic tiếp theo
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        console.warn('[checkBookingConflicts] 404 - Endpoint không tồn tại, giả sử không có conflict');
      }
      return [];
    }
  },

  // PATCH /bookings/{id}/approve
  approveBooking: async (bookingId, campus, adminName, alternativeFacilityId = null) => {
    try {
      const payload = {};
      if (alternativeFacilityId) {
        payload.alternativeFacilityId = alternativeFacilityId;
      }
      
      const data = await apiRequest(`/bookings/${bookingId}/approve`, {
        method: 'PATCH',
        body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined
      });
      return data;
    } catch (error) {
      console.error('[approveBooking] Error:', error);
      throw error;
    }
  },

  // PATCH /bookings/{id}/reject
  rejectBooking: async (bookingId, reason, adminName) => {
    try {
      const data = await apiRequest(`/bookings/${bookingId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      });
      return data;
    } catch (error) {
      console.error('[rejectBooking] Error:', error);
      throw error;
    }
  },
};

// Export default là axios instance để các service khác dùng (bookingService, resourceService, etc.)
export default axiosClient;
