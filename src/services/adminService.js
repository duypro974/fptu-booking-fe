// src/services/adminService.js
import api from "./api";
import { apiRequest } from '../config/api';
import { getAllBookings } from "./bookingService";

// Helper: Map campus string (hcm, hn) sang campusId number cho backend
const getCampusId = (campus) => {
  if (typeof campus === 'number') return campus;
  const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
  return campusMap[campus?.toLowerCase()] || null;
};

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

// GET /bookings/pending-approvals?campusId
export const getPendingApprovals = async (campus) => {
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
};

// GET /bookings/conflicts?campusId - Xem các đơn bị xung đột lịch (tất cả)
export const getAllConflicts = async (campus) => {
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
};

// GET /bookings/conflicts?campusId - Xem conflicts của một booking cụ thể
export const checkBookingConflicts = async (bookingId, campus) => {
  try {
    const campusId = getCampusId(campus);
    const params = campusId ? `?campusId=${campusId}` : '';
    const allConflicts = await apiRequest(`/bookings/conflicts${params}`);
    const conflictsArray = Array.isArray(allConflicts) ? allConflicts : [];
    
    const relatedConflicts = conflictsArray.filter(conflict => {
      return conflict.id === bookingId || 
             conflict.bookingId === bookingId ||
             (conflict.facilityId && conflict.facilityId === bookingId);
    });
    
    console.log('[checkBookingConflicts] Found', relatedConflicts.length, 'conflicts for booking', bookingId);
    return relatedConflicts;
  } catch (error) {
    console.error('[checkBookingConflicts] Error:', error);
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      console.warn('[checkBookingConflicts] 404 - Endpoint không tồn tại');
    }
    return [];
  }
};

// PATCH /bookings/{id}/approve
export const approveBooking = async (bookingId, campus, adminName, alternativeFacilityId = null) => {
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
};

// PATCH /bookings/{id}/reject
export const rejectBooking = async (bookingId, reason, adminName) => {
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
};

// GET /bookings/all-bookings?campusId - Lấy tất cả bookings và map sang format history log
export const getAllHistory = async (campusId) => {
  try {
    // Convert campusId sang number nếu cần
    let numericCampusId = null;
    if (campusId !== undefined && campusId !== null) {
      numericCampusId = typeof campusId === 'string' ? parseInt(campusId, 10) : Number(campusId);
      // Map campus string (hcm, hn) sang campusId number
      if (isNaN(numericCampusId)) {
        const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
        numericCampusId = campusMap[campusId?.toLowerCase()] || null;
      }
    }
    
    console.log('[getAllHistory] Calling getAllBookings with campusId:', numericCampusId);
    
    // Gọi API /bookings/all-bookings
    const bookings = await getAllBookings(numericCampusId);
    
    if (!Array.isArray(bookings)) {
      console.log('[getAllHistory] No bookings returned, returning empty array');
      return [];
    }
    
    console.log('[getAllHistory] Received', bookings.length, 'bookings');
    
    // Map bookings sang format history log
    const historyLogs = bookings.map((booking) => {
      const startTime = new Date(booking.startTime);
      const endTime = new Date(booking.endTime);
      const createdAt = new Date(booking.createdAt);
      
      // Format thời gian
      const formatDateTime = (date) => {
        return date.toLocaleString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      };
      
      // Map status sang action
      const getAction = (status) => {
        switch (status) {
          case 'PENDING':
            return 'Đơn đặt phòng mới';
          case 'APPROVED':
            return 'Đơn đặt phòng đã duyệt';
          case 'REJECTED':
            return 'Đơn đặt phòng bị từ chối';
          case 'CANCELLED':
            return 'Đơn đặt phòng đã hủy';
          case 'COMPLETED':
            return 'Đơn đặt phòng đã hoàn thành';
          case 'PREEMPTED':
            return 'Đơn đặt phòng bị thay thế';
          default:
            return `Đơn đặt phòng - ${status}`;
        }
      };
      
      return {
        id: booking.id,
        action: getAction(booking.status),
        entityType: 'booking',
        entityName: booking.facility?.name || 'Phòng không xác định',
        userName: booking.user?.fullName || booking.user?.email || 'Người dùng không xác định',
        timestamp: formatDateTime(createdAt),
        changes: `Đặt phòng ${booking.facility?.name || ''} từ ${formatDateTime(startTime)} đến ${formatDateTime(endTime)}. Số người: ${booking.attendeeCount || 0}. Loại: ${booking.bookingType?.name || 'N/A'}`,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        attendeeCount: booking.attendeeCount,
        facility: booking.facility,
        user: booking.user,
        bookingType: booking.bookingType,
        isCheckedIn: booking.isCheckedIn
      };
    });
    
    // Sắp xếp theo thời gian tạo (mới nhất trước)
    historyLogs.sort((a, b) => {
      const timeA = new Date(a.startTime || a.timestamp).getTime();
      const timeB = new Date(b.startTime || b.timestamp).getTime();
      return timeB - timeA;
    });
    
    return historyLogs;
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

// GET /bookings/conflicts?facilityId={id}&startTime={time}&endTime={time}
// Kiểm tra xung đột lịch đặt phòng
export const checkConflicts = async (facilityId, startTime, endTime) => {
  try {
    const params = new URLSearchParams();
    params.append('facilityId', facilityId);
    params.append('startTime', startTime);
    params.append('endTime', endTime);
    
    console.log('[checkConflicts] Calling API with params:', { facilityId, startTime, endTime });
    const data = await apiRequest(`/bookings/conflicts?${params.toString()}`);
    console.log('[checkConflicts] API response:', data);
    console.log('[checkConflicts] Response type:', Array.isArray(data) ? 'array' : typeof data);
    if (Array.isArray(data) && data.length > 0) {
      console.log('[checkConflicts] First conflict sample:', data[0]);
      console.log('[checkConflicts] First conflict keys:', Object.keys(data[0]));
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[checkConflicts] Error:', error);
    // Nếu 404, trả về empty array (không có conflict)
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      return [];
    }
    throw error;
  }
};

// PATCH /bookings/{id}/reject - Reject booking với lý do
export const rejectBookingWithReason = async (bookingId, reason) => {
  try {
    const data = await apiRequest(`/bookings/${bookingId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
    return data;
  } catch (error) {
    console.error('[rejectBookingWithReason] Error:', error);
    throw error;
  }
};

// ========== REPORTS APIs ==========
// GET /reports - Danh sách báo cáo (Admin)
export const getReports = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.type) queryParams.append('type', params.type);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const queryString = queryParams.toString();
    const endpoint = `/reports${queryString ? `?${queryString}` : ''}`;
    const data = await apiRequest(endpoint);
    return data;
  } catch (error) {
    console.error('[getReports] Error:', error);
    throw error;
  }
};

// GET /reports/{id} - Xem chi tiết báo cáo
export const getReportDetail = async (reportId) => {
  try {
    const data = await apiRequest(`/reports/${reportId}`);
    return data;
  } catch (error) {
    console.error('[getReportDetail] Error:', error);
    throw error;
  }
};

