/* eslint-disable no-unused-vars */
// src/services/api.js

import axios from "axios";
import { apiRequest } from '../config/api';
import * as adminService from './adminService';
import * as facilityService from './facilityService';
import * as equipmentService from './equipmentService';
import * as clubService from './clubService';
import * as bookingService from './bookingService';

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


// Object với các methods dùng apiRequest (cho ApprovalList, etc.)
export const api = {
  getCampuses: () => [
    { id: "hcm", name: "FPTU TP.HCM (Quận 9)" },
    { id: "hn", name: "FPTU Hòa Lạc (Hà Nội)" },
  ],

  // ========== FACILITY APIs ==========
  // Re-export từ facilityService để giữ backward compatibility
  getFacilityTypes: facilityService.getFacilityTypes,
  getRooms: facilityService.getRooms,
  getFacilityDetail: facilityService.getFacilityDetail,
  createRoom: facilityService.createRoom,
  updateRoom: facilityService.updateRoom,
  deleteRoom: facilityService.deleteRoom,

  // ========== BOOKING APIs ==========
  // Re-export từ bookingService để giữ backward compatibility
  searchAvailableRooms: bookingService.searchAvailableRooms,
  createBooking: bookingService.createBookingWithFormat,
  scanRecurringAvailability: bookingService.scanRecurringAvailability,
  createRecurringBooking: bookingService.createRecurringBooking,
  
  // Lấy lịch biểu của phòng (theo ngày)
  // TODO: API này chưa có endpoint từ backend, cần implement sau
  getRoomSchedule: async (facilityId, date, viewType = "day") => {
    throw new Error('getRoomSchedule API chưa được implement - cần backend endpoint');
  },

  // ========== CLUB APIs ==========
  // Re-export từ clubService với wrapper để giữ format cũ
  getClubs: async (campusId = null) => {
    try {
      // Map để giữ format cũ với limit
      const params = new URLSearchParams();
      if (campusId) {
        params.append('campusId', campusId);
      }
      params.append('limit', '1000');
      
      const queryString = params.toString();
      const allClubs = await apiRequest(`/clubs${queryString ? `?${queryString}` : ''}`);
      console.log('[getClubs] Raw clubs data:', allClubs);
      console.log('[getClubs] Total clubs received:', allClubs?.length || 0);
      
      return allClubs.map(c => ({
        ...c,
        description: c.description || '',
        campus: c.campusId === 1 ? 'hn' : (c.campusId === 2 ? 'hcm' : 'other')
      }));
    } catch (error) {
      console.error('[getClubs] Error:', error);
      throw error;
    }
  },
  getClubPriorityRooms: async (clubId) => {
    try {
      const priorities = await clubService.getClubPriorities(clubId);
      console.log('[getClubPriorityRooms] Raw priorities for club', clubId, ':', priorities);
      console.log('[getClubPriorityRooms] Raw priorities count:', priorities?.length || 0);
      
      const mapped = priorities.map(p => {
        const facilityId = p.facilityId || p.id || p.facility?.id;
        const name = p.facility?.name || p.name || p.facilityName || null;
        return {
          id: facilityId,
          name: name,
          facilityId: facilityId,
          facility: p.facility,
          isPriority: true,
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
  createClub: clubService.createClub,
  updateClub: clubService.updateClub,
  deleteClub: clubService.deleteClub,

  // ========== MY BOOKINGS ==========
  // Re-export từ bookingService
  getMyBookings: bookingService.getMyBookings,
  cancelBooking: async (bookingId, reason) => {
    try {
      const payload = reason ? { reason } : {};
      const data = await apiRequest(`/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined
      });
      return data;
    } catch (error) {
      console.error('[cancelBooking] Error:', error);
      throw error;
    }
  },

  // ========== ADMIN APIs ==========
  // Re-export từ adminService để giữ backward compatibility
  getPendingApprovals: adminService.getPendingApprovals,
  getAllConflicts: adminService.getAllConflicts,
  checkBookingConflicts: adminService.checkBookingConflicts,
  approveBooking: adminService.approveBooking,
  rejectBooking: adminService.rejectBooking,
  getAllHistory: adminService.getAllHistory,

  // ========== EQUIPMENT APIs ==========
  // Re-export từ equipmentService để giữ backward compatibility
  getEquipmentTypes: equipmentService.getEquipmentTypes,
  createEquipmentType: equipmentService.createEquipmentType,
  addEquipmentToFacility: equipmentService.addEquipmentToFacility,
};

// Export default là axios instance để các service khác dùng (bookingService, resourceService, etc.)
export default axiosClient;
