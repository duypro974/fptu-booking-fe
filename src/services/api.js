/* eslint-disable no-unused-vars */
// src/services/api.js

import { apiRequest } from '../config/api';

// ========== CONFIGURATION ==========
// API Mode: REAL API ONLY (Mock đã được loại bỏ)
console.log(`[API Config] Using REAL API`);

// Helper: Map campus string (hcm, hn) sang campusId number cho backend
const getCampusId = (campus) => {
  if (typeof campus === 'number') return campus;
  const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
  return campusMap[campus?.toLowerCase()] || null;
};

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
    const { campusId, facilityTypeId, minCapacity, maxCapacity, searchQuery } = filters;
    
    try {
      const params = new URLSearchParams();
      if (facilityTypeId) params.append('typeId', facilityTypeId);
      
      const endpoint = `/resources/facilities${params.toString() ? '?' + params.toString() : ''}`;
      const facilities = await apiRequest(endpoint);
      
      let filtered = facilities.map(f => {
        // Lấy ảnh đầu tiên từ imageUrls array, fallback về imageUrl, cuối cùng dùng default
        const imageUrl = f.imageUrls?.[0] || f.imageUrl || "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600";
        console.log(`[getRooms] Room ${f.id} (${f.name}): imageUrl =`, imageUrl);
        
        return {
          id: f.id,
          campus: f.campusId === 1 ? 'hn' : (f.campusId === 2 ? 'hcm' : 'other'),
          name: f.name,
          type: f.type?.name || f.facilityType?.name || 'Unknown',
          typeId: f.typeId || f.facilityTypeId || f.type?.id,
          capacity: f.capacity,
          status: f.status,
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
      filtered = filtered.filter(room => room.facilityStatus !== 'maintenance');
      
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
      const params = campusId ? `?campusId=${campusId}` : '';
      const clubs = await apiRequest(`/clubs${params}`);
      return clubs.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        campus: c.campusId === 1 ? 'hn' : 'hcm'
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
      return priorities.map(p => ({
        id: p.facilityId,
        name: p.facility?.name || 'Unknown',
        isPriority: true
      }));
    } catch (error) {
      console.error('[getClubPriorityRooms] Error:', error);
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
};

// Export default để tương thích với authService.js và các file khác
export default api;
