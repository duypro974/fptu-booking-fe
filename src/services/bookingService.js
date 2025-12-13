// src/services/bookingService.js
import api from "./api";

// GET /bookings/search?date&slot&typeId&capacity
export const searchAvailableRooms = async ({ date, slot, typeId, capacity }) => {
  const params = { date, slot };
  if (typeId) params.typeId = typeId;
  if (capacity) params.capacity = capacity;

  const res = await api.get("/bookings/search", { params });
  return res.data;
};

// POST /bookings
export const createBooking = async (payload) => {
  const res = await api.post("/bookings", payload);
  return res.data; // BookingResponse
};

// GET /bookings/club-suggestions?date&slot
export const getClubSuggestions = async ({ date, slot }) => {
  const res = await api.get("/bookings/club-suggestions", { params: { date, slot } });
  return res.data;
};
