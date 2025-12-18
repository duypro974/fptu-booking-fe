/* eslint-disable no-unused-vars */
// src/services/api.js

import axios from "axios";
import { apiRequest } from "../config/api";
import * as adminService from "./adminService";
import * as facilityService from "./facilityService";
import * as equipmentService from "./equipmentService";
import * as clubService from "./clubService";
import * as bookingService from "./bookingService";
import * as securityService from "./securityService"; // ✅ THÊM

// ========== CONFIGURATION ==========
// API Mode: REAL API ONLY (Mock đã được loại bỏ)
console.log(`[API Config] Using REAL API`);

// Tạo axios instance để các service khác dùng (api.get, api.post, etc.)
// Tự động thêm /api nếu URL từ env không có /api ở cuối
const getAxiosBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || "http://localhost:6969";
  // Nếu URL không kết thúc bằng /api, thêm /api vào
  if (!envUrl.endsWith("/api")) {
    return envUrl.endsWith("/") ? `${envUrl}api` : `${envUrl}/api`;
  }
  return envUrl;
};

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:6969/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Bearer token interceptor (localStorage OR cookie)
axiosClient.interceptors.request.use((config) => {
  const lsToken = localStorage.getItem("access_token");

  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("access_token="))
    ?.split("=")[1];

  const token = lsToken || cookieToken;

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
  if (typeof campus === "number") return campus;
  const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
  return campusMap[campus?.toLowerCase()] || null;
};

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
    throw new Error(
      "getRoomSchedule API chưa được implement - cần backend endpoint"
    );
  },

  // ========== CLUB APIs ==========
  // Re-export từ clubService với wrapper để giữ format cũ
  getClubs: async (campusId = null) => {
    try {
      // Map để giữ format cũ với limit
      const params = new URLSearchParams();
      if (campusId) {
        params.append("campusId", campusId);
      }
      params.append("limit", "1000");

      const queryString = params.toString();
      const allClubs = await apiRequest(
        `/clubs${queryString ? `?${queryString}` : ""}`
      );
      console.log("[getClubs] Raw clubs data:", allClubs);
      console.log(
        "[getClubs] Total clubs received:",
        allClubs?.length || 0
      );

      return allClubs.map((c) => ({
        ...c,
        description: c.description || "",
        campus: c.campusId === 1 ? "hn" : c.campusId === 2 ? "hcm" : "other",
      }));
    } catch (error) {
      console.error("[getClubs] Error:", error);
      throw error;
    }
  },

  getClubPriorityRooms: async (clubId) => {
    try {
      const priorities = await clubService.getClubPriorities(clubId);
      console.log(
        "[getClubPriorityRooms] Raw priorities for club",
        clubId,
        ":",
        priorities
      );
      console.log(
        "[getClubPriorityRooms] Raw priorities count:",
        priorities?.length || 0
      );

      const mapped = priorities.map((p) => {
        const facilityId = p.facilityId || p.id || p.facility?.id;
        const name =
          p.facility?.name || p.name || p.facilityName || null;
        return {
          id: facilityId,
          name: name,
          facilityId: facilityId,
          facility: p.facility,
          isPriority: true,
          ...p,
        };
      });

      console.log(
        "[getClubPriorityRooms] Mapped priorities count:",
        mapped.length
      );
      return mapped;
    } catch (error) {
      console.error("[getClubPriorityRooms] Error:", error);
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
        method: "PATCH",
        body:
          Object.keys(payload).length > 0
            ? JSON.stringify(payload)
            : undefined,
      });
      return data;
    } catch (error) {
      console.error("[cancelBooking] Error:", error);
      throw error;
    }
  },

  // ========== ADMIN APIs ==========
  // GET /bookings/pending-approvals?campusId
  getPendingApprovals: async (campus) => {
    try {
      const campusId = getCampusId(campus);
      const params = campusId ? `?campusId=${campusId}` : "";
      const data = await apiRequest(`/bookings/pending-approvals${params}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[getPendingApprovals] Error:", error);
      // Nếu 404, trả về empty array
      if (
        error.message?.includes("404") ||
        error.message?.includes("Not Found")
      ) {
        return [];
      }
      throw error;
    }
  },

  // GET /bookings/conflicts?campusId - Xem các đơn bị xung đột lịch (tất cả)
  getAllConflicts: async (campus) => {
    try {
      const campusId = getCampusId(campus);
      const params = campusId ? `?campusId=${campusId}` : "";
      const data = await apiRequest(`/bookings/conflicts${params}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[getAllConflicts] Error:", error);
      // Nếu 404, trả về empty array
      if (
        error.message?.includes("404") ||
        error.message?.includes("Not Found")
      ) {
        return [];
      }
      throw error;
    }
  },

  // GET /bookings/conflicts?campusId - Xem conflicts của một booking cụ thể
  // Backend chỉ có endpoint /bookings/conflicts (lấy tất cả), không có /bookings/{id}/conflicts
  checkBookingConflicts: async (bookingId, campus) => {
    try {
      const campusId = getCampusId(campus);
      const params = campusId ? `?campusId=${campusId}` : "";
      const allConflicts = await apiRequest(`/bookings/conflicts${params}`);
      const conflictsArray = Array.isArray(allConflicts) ? allConflicts : [];

      const relatedConflicts = conflictsArray.filter((conflict) => {
        return (
          conflict.id === bookingId ||
          conflict.bookingId === bookingId ||
          (conflict.facilityId && conflict.facilityId === bookingId)
        );
      });

      console.log(
        "[checkBookingConflicts] Found",
        relatedConflicts.length,
        "conflicts for booking",
        bookingId,
        "out of",
        conflictsArray.length,
        "total conflicts"
      );
      return relatedConflicts;
    } catch (error) {
      console.error("[checkBookingConflicts] Error:", error);
      if (
        error.message?.includes("404") ||
        error.message?.includes("Not Found")
      ) {
        console.warn(
          "[checkBookingConflicts] 404 - Endpoint không tồn tại, giả sử không có conflict"
        );
      }
      return [];
    }
  },

  // PATCH /bookings/{id}/approve
  approveBooking: async (
    bookingId,
    campus,
    adminName,
    alternativeFacilityId = null
  ) => {
    try {
      const payload = {};
      if (alternativeFacilityId) {
        payload.alternativeFacilityId = alternativeFacilityId;
      }

      const data = await apiRequest(`/bookings/${bookingId}/approve`, {
        method: "PATCH",
        body:
          Object.keys(payload).length > 0
            ? JSON.stringify(payload)
            : undefined,
      });
      return data;
    } catch (error) {
      console.error("[approveBooking] Error:", error);
      throw error;
    }
  },

  // PATCH /bookings/{id}/reject
  rejectBooking: async (bookingId, reason, adminName) => {
    try {
      const data = await apiRequest(`/bookings/${bookingId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      return data;
    } catch (error) {
      console.error("[rejectBooking] Error:", error);
      throw error;
    }
  },

  // ========== EQUIPMENT APIs ==========
  // GET /equipment/facilities/{facilityId} - Danh sách thiết bị của phòng
  getFacilityEquipment: async (facilityId) => {
    try {
      const data = await apiRequest(`/equipment/facilities/${facilityId}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[getFacilityEquipment] Error:", error);
      return [];
    }
  },

  // ========== SECURITY (GUARD) APIs ==========
  // ✅ Thêm các API cho bảo vệ: xem đơn, mở cửa (check-in), đóng cửa (check-out), báo cáo sự cố
  guardSearchBookings: securityService.searchCheckinBookings,
  guardCheckIn: securityService.checkInBooking,
  guardCheckOut: securityService.checkOutBooking,
  reportFacilityIssue: securityService.reportFacilityIssue,
};

// Export default là axios instance để các service khác dùng (bookingService, resourceService, etc.)
export default axiosClient;
