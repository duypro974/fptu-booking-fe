# Danh sách API chưa được sử dụng

## ❌ CHƯA ĐƯỢC SỬ DỤNG

### 1. **GET /bookings/conflicts** - `getAllConflicts()`
- **File:** `src/services/api.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Lấy danh sách tất cả conflicts (khác với `checkBookingConflicts` cho từng booking)
- **Khuyến nghị:** Có thể cần cho trang quản lý conflicts tổng thể

### 2. **POST /maintenance/set** - `setMaintenance()`
- **File:** `src/services/maintenanceService.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Thiết lập bảo trì phòng & Auto chuyển phòng
- **Khuyến nghị:** Cần tạo UI để admin set maintenance cho phòng

### 3. **POST /campuses** - `createCampus()`
- **File:** `src/services/resourceService.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Tạo Campus mới
- **Khuyến nghị:** Chỉ Campus Admin mới cần, có thể chưa có UI

### 4. **PUT /campuses/{id}** - `updateCampus()`
- **File:** `src/services/resourceService.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Cập nhật Campus
- **Khuyến nghị:** Chỉ Campus Admin mới cần, có thể chưa có UI

### 5. **DELETE /campuses/{id}** - `deleteCampus()`
- **File:** `src/services/resourceService.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Xóa Campus
- **Khuyến nghị:** Chỉ Campus Admin mới cần, có thể chưa có UI

### 6. **POST /facility-types** - `createFacilityType()`
- **File:** `src/services/resourceService.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Tạo loại phòng mới
- **Khuyến nghị:** Cần UI để admin tạo loại phòng (Lab, Meeting Room, etc.)

### 7. **PUT /facility-types/{id}** - `updateFacilityType()`
- **File:** `src/services/resourceService.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Cập nhật loại phòng
- **Khuyến nghị:** Cần UI để admin chỉnh sửa loại phòng

### 8. **DELETE /facility-types/{id}** - `deleteFacilityType()`
- **File:** `src/services/resourceService.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Xóa loại phòng
- **Khuyến nghị:** Cần UI để admin xóa loại phòng

### 9. **POST /facilities** - `createFacility()` (trong resourceService.js)
- **File:** `src/services/resourceService.js`
- **Status:** ⚠️ Có thể được dùng qua `api.createRoom()` trong RoomManagement
- **Lưu ý:** Cần kiểm tra xem `api.createRoom()` có tồn tại không

### 10. **PUT /facilities/{id}** - `updateFacility()` (trong resourceService.js)
- **File:** `src/services/resourceService.js`
- **Status:** ⚠️ Có thể được dùng qua `api.updateRoom()` trong RoomManagement
- **Lưu ý:** Cần kiểm tra xem `api.updateRoom()` có tồn tại không

### 11. **DELETE /facilities/{id}** - `deleteFacility()` (trong resourceService.js)
- **File:** `src/services/resourceService.js`
- **Status:** ⚠️ Có thể được dùng qua `api.deleteRoom()` trong RoomManagement
- **Lưu ý:** Cần kiểm tra xem `api.deleteRoom()` có tồn tại không

### 12. **POST /clubs/{id}/priorities** - `addClubPriority()`
- **File:** `src/services/clubService.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Thêm phòng ưu tiên cho CLB
- **Khuyến nghị:** Cần implement logic trong `ClubManagement.jsx` để thêm priority rooms sau khi tạo club (có TODO comment)

### 13. **DELETE /clubs/{id}/priorities/{facilityId}** - `removeClubPriority()`
- **File:** `src/services/clubService.js`
- **Status:** ❌ Chưa được gọi ở đâu
- **Mô tả:** Gỡ bỏ phòng ưu tiên của CLB
- **Khuyến nghị:** Cần implement logic trong `ClubManagement.jsx` để xóa priority rooms

## ✅ ĐÃ ĐƯỢC SỬ DỤNG

1. ✅ `getPendingApprovals()` - ApprovalList.jsx
2. ✅ `checkBookingConflicts()` - ApprovalList.jsx
3. ✅ `approveBooking()` - ApprovalList.jsx
4. ✅ `rejectBooking()` - ApprovalList.jsx
5. ✅ `getClubs()` - ClubManagement.jsx
6. ✅ `createClub()` - ClubManagement.jsx
7. ✅ `updateClub()` - ClubManagement.jsx
8. ✅ `deleteClub()` - ClubManagement.jsx
9. ✅ `getClubPriorityRooms()` - Có thể được dùng trong ClubManagement detail modal
10. ✅ `getRooms()` - ClubManagement.jsx, RoomManagement.jsx, EquipmentManagement.jsx
11. ✅ `getFacilityTypes()` - BookingForm.jsx, RoomManagement.jsx
12. ✅ `createBooking()` - BookingForm.jsx
13. ✅ `searchAvailableRooms()` - RoomSearch.jsx

## 📋 TÓM TẮT

- **Tổng số API đã implement:** ~25 functions
- **Đã được sử dụng:** ~13 functions
- **Chưa được sử dụng:** ~12 functions

### Các API quan trọng cần implement UI:
1. **Maintenance Management** - `setMaintenance()` - Cần UI để set bảo trì phòng
2. **Club Priority Rooms** - `addClubPriority()`, `removeClubPriority()` - Cần hoàn thiện logic trong ClubManagement
3. **Facility Type Management** - `createFacilityType()`, `updateFacilityType()`, `deleteFacilityType()` - Cần UI quản lý loại phòng
4. **Campus Management** - `createCampus()`, `updateCampus()`, `deleteCampus()` - Chỉ Campus Admin cần (có thể chưa cần)

