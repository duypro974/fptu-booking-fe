// src/services/bookingService.js
import api from "./api";

/** =========================
 *  SEARCH (MW1)
 *  GET /bookings/search?date&slot&typeId&capacity
 *  ========================= */
export const searchAvailableRooms = async ({ date, slot, typeId, capacity }) => {
  const params = { date, slot: Number(slot) };
  if (typeId) params.typeId = Number(typeId);
  if (capacity) params.capacity = Number(capacity);

  const res = await api.get("/bookings/search", { params });
  return res.data;
};

/** =========================
 *  CREATE BOOKING
 *  POST /bookings
 *  ========================= */
export const createBooking = async (payload) => {
  const res = await api.post("/bookings", payload);
  return res.data;
};

/** =========================
 *  MY BOOKINGS (NEW)
 *  GET /bookings/me
 *  ========================= */
export const getMyBookings = async () => {
  try {
    console.log('[bookingService.getMyBookings] Calling API /bookings/me');
    const res = await api.get("/bookings/me");
    console.log('[bookingService.getMyBookings] Response:', res.data);
    return res.data;
  } catch (error) {
    console.error('[bookingService.getMyBookings] Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    throw error;
  }
};

/** =========================
 *  BOOKING DETAIL (NEW)
 *  GET /bookings/{id}
 *  ========================= */
export const getBookingDetail = async (id) => {
  const res = await api.get(`/bookings/${id}`);
  return res.data;
};

/** =========================
 *  CANCEL BOOKING (NEW)
 *  PATCH /bookings/{id}/cancel
 *  ========================= */
export const cancelBooking = async (id) => {
  const res = await api.patch(`/bookings/${id}/cancel`);
  return res.data;
};

/** =========================
 *  CLUB SUGGESTIONS (MW3)
 *  GET /bookings/club-suggestions?date&slot
 *  ========================= */
export const getClubSuggestions = async ({ date, slot }) => {
  const res = await api.get("/bookings/club-suggestions", {
    params: { date, slot: Number(slot) },
  });
  return res.data;
};

/** =========================
 *  LECTURER SPECIFIC - RECURRING BOOKINGS (MW2.2, MW2.4)
 *  ========================= */

// POST /bookings/recurring/scan
// [MW2.2] Scan tính khả dụng cho lịch định kỳ
export const scanRecurringAvailability = async (payload) => {
  const res = await api.post("/bookings/recurring/scan", payload);
  return res.data;
};

// POST /bookings/recurring
// [MW2.4] Tạo Booking định kỳ (Transaction)
export const createRecurringBooking = async (payload) => {
  const res = await api.post("/bookings/recurring", payload);
  return res.data;
};

/** =========================
 *  SECURITY GUARD APIs (MW5)
 *  ========================= */

// GET /bookings/guard/search?keyword
// Tìm đơn Check-in theo Tên SV, Mã Booking. Chỉ hiện đơn APPROVED trong ngày.
export const searchGuardBookings = async (keyword) => {
  const res = await api.get("/bookings/guard/search", {
    params: { keyword: keyword || "" },
  });
  return res.data;
};

// PATCH /bookings/{id}/check-in
// Mở cửa / Check-in
export const checkInBooking = async (id) => {
  const res = await api.patch(`/bookings/${id}/check-in`);
  return res.data;
};

// PATCH /bookings/{id}/check-out
// Đóng cửa / Check-out
export const checkOutBooking = async (id) => {
  const res = await api.patch(`/bookings/${id}/check-out`);
  return res.data;
};

/** =========================
 *  REPORT FACILITY ISSUE (SW4)
 *  POST /reports/facility/{facilityId}
 *  ========================= */
export const reportFacilityIssue = async (facilityId, reportData) => {
  const res = await api.post(`/reports/facility/${facilityId}`, reportData);
  return res.data;
};
