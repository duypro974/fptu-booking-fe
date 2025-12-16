// src/services/facilityService.js
import { apiRequest } from '../config/api';

// GET /facility-types - Lấy danh sách loại phòng
export const getFacilityTypes = async () => {
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
};

// GET /resources/facilities - Xem danh sách phòng (Campus của tôi)
export const getRooms = async (filters = {}) => {
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
        floor: f.floor || 0,
        equipment: f.equipment || [] // Giữ lại equipment từ response
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
};

// GET /resources/facilities/{id} - Xem chi tiết 1 phòng
export const getFacilityDetail = async (facilityId) => {
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
};

// POST /resources/facilities - Tạo phòng mới
export const createRoom = async (payload) => {
  try {
    console.log('[createRoom] Payload:', payload);
    const data = await apiRequest('/resources/facilities', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  } catch (error) {
    console.error('[createRoom] Error:', error);
    throw error;
  }
};

// PUT /resources/facilities/{id} - Cập nhật phòng
export const updateRoom = async (id, payload) => {
  try {
    console.log('[updateRoom] ID:', id, 'Payload:', payload);
    const data = await apiRequest(`/resources/facilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return data;
  } catch (error) {
    console.error('[updateRoom] Error:', error);
    throw error;
  }
};

// DELETE /resources/facilities/{id} - Xóa phòng
export const deleteRoom = async (id) => {
  try {
    console.log('[deleteRoom] ID:', id);
    const data = await apiRequest(`/resources/facilities/${id}`, {
      method: 'DELETE'
    });
    return data;
  } catch (error) {
    console.error('[deleteRoom] Error:', error);
    throw error;
  }
};
