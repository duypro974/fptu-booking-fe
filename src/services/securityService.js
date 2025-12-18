// src/services/securityService.js
import api from "./api";

/**
 * SECURITY (Guard) APIs
 * - GET   /bookings/guard/search?keyword=...
 * - PATCH /bookings/{id}/check-in
 * - PATCH /bookings/{id}/check-out
 * - POST  /reports/facility/{facilityId}
 */
export const searchCheckinBookings = async (keyword = "") => {
  const res = await api.get("/bookings/guard/search", { params: { keyword } });
  return res.data;
};

export const checkInBooking = async (bookingId) => {
  const res = await api.patch(`/bookings/${bookingId}/check-in`);
  return res.data;
};

export const checkOutBooking = async (bookingId) => {
  const res = await api.patch(`/bookings/${bookingId}/check-out`);
  return res.data;
};

export const reportFacilityIssue = async (facilityId, payload) => {
  // payload: { title, description, category, imageUrls }
  const res = await api.post(`/reports/facility/${facilityId}`, payload);
  return res.data;
};
