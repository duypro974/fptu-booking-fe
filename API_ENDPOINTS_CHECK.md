# Kiểm tra API Endpoints - So sánh Swagger vs Frontend

## Danh sách API từ Swagger (Admin APIs)

### ✅ ĐÃ IMPLEMENT

1. **GET /bookings/pending-approvals** ✅
   - File: `src/services/api.js` - `getPendingApprovals()`
   - Status: ✅ Có

2. **PATCH /bookings/{id}/approve** ✅
   - File: `src/services/api.js` - `approveBooking()`
   - Status: ✅ Có

3. **PATCH /bookings/{id}/reject** ✅
   - File: `src/services/api.js` - `rejectBooking()`
   - Status: ✅ Có

4. **POST /maintenance/set** ✅
   - File: `src/services/maintenanceService.js` - `setMaintenance()`
   - Status: ✅ Có

5. **POST /campuses** ✅
   - File: `src/services/resourceService.js` - `createCampus()`
   - Status: ✅ Có

6. **PUT /campuses/{id}** ✅
   - File: `src/services/resourceService.js` - `updateCampus()`
   - Status: ✅ Có

7. **DELETE /campuses/{id}** ✅
   - File: `src/services/resourceService.js` - `deleteCampus()`
   - Status: ✅ Có

8. **PUT /facility-types/{id}** ✅
   - File: `src/services/resourceService.js` - `updateFacilityType()`
   - Status: ✅ Có

9. **DELETE /facility-types/{id}** ✅
   - File: `src/services/resourceService.js` - `deleteFacilityType()`
   - Status: ✅ Có

10. **POST /facilities** ✅
    - File: `src/services/resourceService.js` - `createFacility()`
    - Status: ✅ Có

11. **PUT /facilities/{id}** ✅
    - File: `src/services/resourceService.js` - `updateFacility()`
    - Status: ✅ Có

12. **DELETE /facilities/{id}** ✅
    - File: `src/services/resourceService.js` - `deleteFacility()`
    - Status: ✅ Có

13. **POST /clubs** ✅
    - File: `src/services/api.js` - `createClub()`
    - Status: ✅ Có

14. **PUT /clubs/{id}** ✅
    - File: `src/services/api.js` - `updateClub()`
    - Status: ✅ Có

15. **DELETE /clubs/{id}** ✅
    - File: `src/services/api.js` - `deleteClub()`
    - Status: ✅ Có

16. **DELETE /clubs/{id}/priorities/{facilityId}** ✅
    - File: `src/services/clubService.js` - `removeClubPriority()`
    - Status: ✅ Có

### ⚠️ CẦN KIỂM TRA / THIẾU

1. **GET /bookings/conflicts** ⚠️
   - Swagger: `GET /bookings/conflicts` - Xem các đơn bị xung đột lịch
   - Frontend hiện tại: `GET /bookings/{id}/conflicts` - `checkBookingConflicts(bookingId, campus)`
   - **Vấn đề:** Endpoint khác nhau!
   - **Cần:** Thêm `GET /bookings/conflicts?campusId=X` để lấy danh sách tất cả conflicts

2. **GET /clubs/{id}/priorities** ✅
   - File: `src/services/api.js` - `getClubPriorityRooms()`
   - Status: ✅ Có (nhưng không thấy trong Swagger list)

3. **POST /clubs/{id}/priorities** ✅
   - File: `src/services/clubService.js` - `addClubPriority()`
   - Status: ✅ Có (nhưng không thấy trong Swagger list)

### 📝 CÁC API KHÁC (Không có trong Swagger list nhưng đã implement)

1. **GET /facility-types** ✅
   - File: `src/services/api.js` - `getFacilityTypes()`
   - Status: ✅ Có

2. **GET /resources/facilities** ✅
   - File: `src/services/api.js` - `getRooms()`
   - Status: ✅ Có

3. **GET /resources/facilities/{id}** ✅
   - File: `src/services/api.js` - `getFacilityDetail()`
   - Status: ✅ Có

4. **GET /bookings/search** ✅
   - File: `src/services/api.js` - `searchAvailableRooms()`
   - Status: ✅ Có

5. **POST /bookings** ✅
   - File: `src/services/api.js` - `createBooking()`
   - Status: ✅ Có

6. **GET /clubs** ✅
   - File: `src/services/api.js` - `getClubs()`
   - Status: ✅ Có

7. **POST /auth/login** ✅
   - File: `src/services/authService.js` - `login()`
   - Status: ✅ Có

8. **GET /auth/profile** ✅
   - File: `src/services/authService.js` - `getProfile()`
   - Status: ✅ Có

## TÓM TẮT

### ✅ Đã có đủ: 16/16 endpoints từ Swagger list
### ⚠️ Cần thêm: 1 endpoint
- `GET /bookings/conflicts` (khác với `GET /bookings/{id}/conflicts` hiện tại)

### 📋 Khuyến nghị:
1. Thêm `getAllConflicts(campusId)` vào `api.js` để lấy danh sách tất cả conflicts
2. Giữ nguyên `checkBookingConflicts(bookingId, campus)` vì có thể cần cho từng booking cụ thể

