# Báo Cáo Lỗi: 401 Unauthorized - Email không tồn tại trong hệ thống

## Mô tả vấn đề
Khi đăng nhập với email `admin_hcm1@fpt.edu.vn`, backend trả về lỗi 401 với message: **"Email không tồn tại trong hệ thống."**

Tuy nhiên, email này **có tồn tại trong database** (đã xác nhận).

## Chi tiết test

### Test Case 1: Test với các campusId khác nhau
- **Email:** `admin_hcm1@fpt.edu.vn`
- **Password:** `123456`
- **Kết quả:**
  - `campusId = 1`: ❌ 401 "Email không tồn tại trong hệ thống."
  - `campusId = 2`: ❌ 401 "Email không tồn tại trong hệ thống."
  - `campusId = 3`: ❌ 401 "Email không tồn tại trong hệ thống."

### Test Case 2: Test với các password khác nhau
- **Email:** `admin_hcm1@fpt.edu.vn`
- **CampusId:** `2`
- **Passwords tested:** `123456`, `admin123`, `password`, `Admin123`
- **Kết quả:** Tất cả đều trả về ❌ 401 "Email không tồn tại trong hệ thống." (KHÔNG phải "Mật khẩu không đúng")

### Test Case 3: Test với case variations
- **CampusId:** `2`
- **Password:** `123456`
- **Emails tested:**
  - `admin_hcm1@fpt.edu.vn`
  - `Admin_hcm1@fpt.edu.vn`
  - `ADMIN_HCM1@fpt.edu.vn`
  - `admin_hcm1@FPT.EDU.VN`
- **Kết quả:** Tất cả đều trả về ❌ 401 "Email không tồn tại trong hệ thống."

### Test Case 4: Email khác (để so sánh)
- **Email:** `admin.hcm@fpt.edu.vn` (dấu chấm, không phải gạch dưới)
- **Password:** `123456`
- **CampusId:** `2`
- **Kết quả:** ✅ **SUCCESS** - Đăng nhập thành công

## Phân tích

### Vấn đề có thể xảy ra:

1. **Backend đang filter theo `campusId`:**
   - Backend có thể đang query: `SELECT * FROM users WHERE email = ? AND campusId = ?`
   - Nếu user `admin_hcm1@fpt.edu.vn` không có `campusId` hoặc `campusId` không khớp với request, sẽ trả về "Email không tồn tại"

2. **Logic kiểm tra email:**
   - Backend có thể kiểm tra email TRƯỚC khi kiểm tra password
   - Nếu không tìm thấy email (theo điều kiện filter), sẽ trả về 401 ngay lập tức

3. **Vấn đề với database query:**
   - Có thể có vấn đề với cách backend query database
   - Có thể có vấn đề với encoding hoặc whitespace trong email

## Yêu cầu Backend Team kiểm tra:

1. **Kiểm tra logic login trong backend:**
   - Xem code xử lý `/auth/login` endpoint
   - Kiểm tra xem có filter theo `campusId` không
   - Kiểm tra query database có đúng không

2. **Kiểm tra database:**
   - Xác nhận user `admin_hcm1@fpt.edu.vn` có tồn tại trong database
   - Kiểm tra `campusId` của user này là gì
   - Kiểm tra email có khoảng trắng hoặc ký tự đặc biệt không

3. **Kiểm tra logic validation:**
   - Xem backend có validate `campusId` như thế nào
   - Xem có yêu cầu user phải thuộc campus được chọn không

## API Endpoint được test:
```
POST https://multi-campus-facility-booking-system-vh0n.onrender.com/api/auth/login
Content-Type: application/json

Body:
{
  "email": "admin_hcm1@fpt.edu.vn",
  "password": "123456",
  "campusId": 2
}
```

## Response:
```json
{
  "message": "Email không tồn tại trong hệ thống."
}
```

## Status Code:
`401 Unauthorized`

## Thời gian test:
Ngày test: Hôm nay
Environment: Production (Render)

