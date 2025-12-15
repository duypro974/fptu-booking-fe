# Hướng dẫn kết nối Frontend với Backend trên Render

## Bước 1: Xác định URL Backend

Backend của bạn đã được deploy tại:
```
https://multi-campus-facility-booking-system-vh0n.onrender.com
```

URL API sẽ là:
```
https://multi-campus-facility-booking-system-vh0n.onrender.com/api
```

## Bước 2: Cấu hình Environment Variable trên Render

### Trên Render Dashboard:

1. **Vào Frontend Service** (service chứa frontend React của bạn)

2. **Vào tab "Environment"**

3. **Thêm Environment Variable:**
   - **Key:** `VITE_API_URL`
   - **Value:** `https://multi-campus-facility-booking-system-vh0n.onrender.com/api`
   - (Thay URL bằng URL backend thực tế của bạn nếu khác)

4. **Save Changes**

5. **Render sẽ tự động rebuild** frontend với environment variable mới

## Bước 3: Kiểm tra

Sau khi rebuild xong:

1. Mở browser console (F12)
2. Kiểm tra log: `console.log(import.meta.env.VITE_API_URL)`
3. Xem network requests có đang gọi đúng URL backend không

## Lưu ý:

- **CORS:** Đảm bảo backend đã cấu hình CORS để cho phép frontend domain
- **HTTPS:** Render dùng HTTPS, đảm bảo backend cũng hỗ trợ HTTPS
- **API Path:** Đảm bảo có `/api` ở cuối URL nếu backend route API qua `/api`

## Troubleshooting:

Nếu vẫn không kết nối được:

1. Kiểm tra backend có đang chạy không
2. Kiểm tra CORS settings trên backend
3. Kiểm tra URL backend có đúng không (có `/api` ở cuối)
4. Xem console logs để debug




