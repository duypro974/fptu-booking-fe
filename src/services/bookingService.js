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
  const res = await api.get("/bookings/me");
  return res.data;
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
