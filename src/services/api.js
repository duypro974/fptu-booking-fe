/* eslint-disable no-unused-vars */
// src/services/api.js

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  getCampuses: () => [
    { id: "hcm", name: "FPTU TP.HCM (Quận 9)" },
    { id: "hn", name: "FPTU Hòa Lạc (Hà Nội)" },
    { id: "dn", name: "FPTU Đà Nẵng" },
    { id: "qn", name: "FPTU Quy Nhơn" },
    { id: "ct", name: "FPTU Cần Thơ" },
  ],

  login: async (email, password, selectedCampusId) => {
    await delay(800); 

    if (!email.includes("@fpt.edu.vn")) {
      throw new Error("Vui lòng sử dụng email @fpt.edu.vn");
    }

    let userRole = "student";
    let campusName = "";
    
    // Lấy thông tin campus mà người dùng ĐANG CHỌN ở dropdown
    const selectedCampusName = api.getCampuses().find(c => c.id === selectedCampusId)?.name;

    // --- 1. ADMIN TỔNG (Quyền cao nhất - Vào đâu cũng được hoặc vào Dashboard tổng) ---
    if (email.includes("admin.tong")) {
      userRole = "facility_admin";
      campusName = "Toàn hệ thống FPTU";
      // Admin tổng không bị ràng buộc bởi campus đã chọn (hoặc có thể để họ chọn để xem view của campus đó)
      // Ở đây mình set mặc định là xem view tổng
      selectedCampusId = "all"; 
    } 
    
    // --- 2. CAMPUS ADMIN (STAFF) - KIỂM TRA NGHIÊM NGẶT ---
    else if (email.includes("staff.")) {
      userRole = "campus_admin";
      
      // Xác định campus CỐ ĐỊNH của staff dựa vào email
      let assignedCampusId = "";
      if (email.includes("hcm")) assignedCampusId = "hcm";
      else if (email.includes("hn")) assignedCampusId = "hn";
      else if (email.includes("dn")) assignedCampusId = "dn";
      else if (email.includes("qn")) assignedCampusId = "qn";
      else if (email.includes("ct")) assignedCampusId = "ct";
      else assignedCampusId = "hcm"; // Fallback nếu không detect được

      // >> LOGIC CHECK LỖI Ở ĐÂY <<
      // Nếu campus họ chọn KHÁC campus họ được phân công -> BÁO LỖI NGAY
      if (selectedCampusId !== assignedCampusId) {
        throw new Error(
          `Lỗi: Tài khoản Staff này chỉ có quyền truy cập ${assignedCampusId.toUpperCase()}, không thể đăng nhập vào ${selectedCampusName}.`
        );
      }

      // Nếu khớp thì ok
      campusName = selectedCampusName;
    } 
    
    // --- 3. SINH VIÊN (Thoải mái) ---
    else {
      userRole = "student";
      campusName = selectedCampusName;
    }

    // Trả về kết quả thành công
    return { 
      id: 123,
      name: userRole === "student" ? "Nguyễn Văn Sinh Viên" : (userRole === "facility_admin" ? "Sếp Tổng" : "Cán bộ Quản lý"),
      email: email,
      role: userRole,
      campus: selectedCampusId,
      campusName: campusName,
      avatar: `https://ui-avatars.com/api/?name=${userRole}&background=random&bold=true`,
      token: "fake-jwt-token" 
    };
  },

  // ... (Các hàm getRooms giữ nguyên)
  getRooms: async (campusId) => {
    // Code cũ giữ nguyên
    await delay(600);
    const allRooms = [
       { id: 1, campus: "hcm", name: "Phòng Seminar 201 (HCM)", type: "Học tập", capacity: 30, status: "available", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600" },
       { id: 2, campus: "hcm", name: "Hội trường Alpha (HCM)", type: "Sự kiện", capacity: 200, status: "busy", image: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=600" },
       { id: 3, campus: "hn", name: "Lab IoT 305 (Hòa Lạc)", type: "Thực hành", capacity: 40, status: "available", image: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=600" },
       { id: 5, campus: "dn", name: "Phòng Họp 101 (Đà Nẵng)", type: "Họp", capacity: 10, status: "available", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600" },
    ];
    if (campusId === "all") return allRooms;
    return allRooms.filter(room => room.campus === campusId);
  },
  
  // Các hàm khác giữ nguyên
  createBooking: async (data) => { await delay(1000); return { success: true }; },
  getMyBookings: async () => [],
  getPendingApprovals: async () => [],
  approveBooking: async () => ({ success: true }),
};