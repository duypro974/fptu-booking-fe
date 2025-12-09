/* eslint-disable no-unused-vars */
// src/services/api.js

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  getCampuses: () => [
    { id: "hcm", name: "FPTU TP.HCM (Quận 9)" },
    { id: "hn", name: "FPTU Hòa Lạc (Hà Nội)" },
    
  ],

  login: async (email, password, selectedCampusId) => {
    await delay(800); 

    if (!email.includes("@fpt.edu.vn")) {
      throw new Error("Vui lòng sử dụng email @fpt.edu.vn");
    }

    let userRole = "student";
    let campusName = "";
    let isClubLeader = false;
    let clubId = null;
    let clubName = null;
    
    // Lấy thông tin campus mà người dùng ĐANG CHỌN ở dropdown
    const selectedCampusName = api.getCampuses().find(c => c.id === selectedCampusId)?.name;

    // --- 1. FACILITY ADMIN (Nhân viên quản lý phòng) - Quyền cao nhất ---
    if (email.includes("facility.admin") || email.includes("facility_admin")) {
      userRole = "facility_admin";
      campusName = selectedCampusName;
      // Facility Admin có thể quản lý phòng của campus được phân công
    } 
    
    // --- 2. CAMPUS ADMIN (Quản lý cơ sở) - Sếp ---
    else if (email.includes("campus.admin") || email.includes("campus_admin")) {
      userRole = "campus_admin";
      campusName = selectedCampusName;
    }
    
    // --- 3. SECURITY GUARD (Bảo vệ) ---
    else if (email.includes("security") || email.includes("guard")) {
      userRole = "security_guard";
      
      // Xác định campus CỐ ĐỊNH của bảo vệ dựa vào email
      let assignedCampusId = "";
      if (email.includes("hcm")) assignedCampusId = "hcm";
      else if (email.includes("hn")) assignedCampusId = "hn";
      else assignedCampusId = "hcm"; // Fallback

      // Kiểm tra campus
      if (selectedCampusId !== assignedCampusId) {
        throw new Error(
          `Lỗi: Tài khoản Bảo vệ này chỉ có quyền truy cập ${assignedCampusId.toUpperCase()}, không thể đăng nhập vào ${selectedCampusName}.`
        );
      }
      campusName = selectedCampusName;
    }
    
    // --- 4. LECTURER (Giảng viên) ---
    else if (email.includes("lecturer") || email.includes("teacher") || email.includes("gv.")) {
      userRole = "lecturer";
      campusName = selectedCampusName;
    }
    
    // --- 5. CLUB LEADER (Chủ nhiệm CLB) ---
    else if (email.includes("club.") || email.includes("leader")) {
      userRole = "student"; // Vẫn là student nhưng có thêm quyền
      isClubLeader = true;
      clubId = 1; // Mock data - sẽ lấy từ DB sau
      clubName = "F-Code"; // Mock data
      campusName = selectedCampusName;
    }
    
    // --- 6. STAFF (Campus Admin cũ) - Giữ để tương thích ---
    else if (email.includes("staff.")) {
      userRole = "campus_admin";
      
      // Xác định campus CỐ ĐỊNH của staff dựa vào email
      let assignedCampusId = "";
      if (email.includes("hcm")) assignedCampusId = "hcm";
      else if (email.includes("hn")) assignedCampusId = "hn";
      else assignedCampusId = "hcm";

      if (selectedCampusId !== assignedCampusId) {
        throw new Error(
          `Lỗi: Tài khoản Staff này chỉ có quyền truy cập ${assignedCampusId.toUpperCase()}, không thể đăng nhập vào ${selectedCampusName}.`
        );
      }
      campusName = selectedCampusName;
    } 
    
    // --- 7. ADMIN TỔNG (Giữ để tương thích) ---
    else if (email.includes("admin")) {
      userRole = "facility_admin";
      campusName = "Toàn hệ thống FPTU";
      selectedCampusId = "all"; 
    } 
    
    // --- 8. SINH VIÊN (Mặc định) ---
    else {
      userRole = "student";
      campusName = selectedCampusName;
    }

    // Xác định tên hiển thị
    let displayName = "Nguyễn Văn Sinh Viên";
    if (userRole === "facility_admin") displayName = "Nhân viên Quản lý Phòng";
    else if (userRole === "campus_admin") displayName = "Quản lý Cơ sở";
    else if (userRole === "security_guard") displayName = "Bảo vệ";
    else if (userRole === "lecturer") displayName = "Giảng viên";
    else if (isClubLeader) displayName = `Chủ nhiệm ${clubName}`;

    // Trả về kết quả thành công
    return { 
      id: 123,
      name: displayName,
      email: email,
      role: userRole,
      campus: selectedCampusId,
      campusName: campusName,
      isClubLeader: isClubLeader,
      clubId: clubId,
      clubName: clubName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&bold=true`,
      token: "fake-jwt-token" 
    };
  },

  // Lấy danh sách loại phòng
  getFacilityTypes: async () => {
    await delay(300);
    return [
      { id: 1, name: "Phòng học", code: "CLASSROOM" },
      { id: 2, name: "Phòng Lab", code: "LAB" },
      { id: 3, name: "Phòng họp", code: "MEETING" },
      { id: 4, name: "Hội trường", code: "AUDITORIUM" },
      { id: 5, name: "Sân thể thao", code: "SPORTS" },
      { id: 6, name: "Phòng chuyên dụng", code: "SPECIAL" },
    ];
  },

  // Lấy danh sách phòng với filters
  getRooms: async (filters = {}) => {
    await delay(600);
    const { campusId, facilityTypeId, minCapacity, maxCapacity, searchQuery, status } = filters;
    
    // Mock data - Danh sách phòng đầy đủ
    const allRooms = [
      { id: 1, campus: "hcm", name: "Phòng Seminar 201", type: "Phòng học", typeId: 1, capacity: 30, status: "active", facilityStatus: "available", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600", building: "Tòa Alpha", floor: 2 },
      { id: 2, campus: "hcm", name: "Hội trường Alpha", type: "Hội trường", typeId: 4, capacity: 200, status: "active", facilityStatus: "available", image: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=600", building: "Tòa Alpha", floor: 1 },
      { id: 3, campus: "hcm", name: "Lab IoT 305", type: "Phòng Lab", typeId: 2, capacity: 40, status: "active", facilityStatus: "maintenance", image: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=600", building: "Tòa Beta", floor: 3 },
      { id: 4, campus: "hcm", name: "Phòng Họp 101", type: "Phòng họp", typeId: 3, capacity: 10, status: "active", facilityStatus: "available", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600", building: "Tòa Alpha", floor: 1 },
      { id: 5, campus: "hcm", name: "Sân Bóng Đá 1", type: "Sân thể thao", typeId: 5, capacity: 22, status: "active", facilityStatus: "available", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=600", building: "Sân thể thao", floor: 0 },
      { id: 6, campus: "hn", name: "Phòng Seminar 301", type: "Phòng học", typeId: 1, capacity: 35, status: "active", facilityStatus: "available", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600", building: "Tòa A", floor: 3 },
      { id: 7, campus: "hn", name: "Lab AI 205", type: "Phòng Lab", typeId: 2, capacity: 25, status: "active", facilityStatus: "available", image: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=600", building: "Tòa B", floor: 2 },
      { id: 8, campus: "hcm", name: "Phòng Âm nhạc", type: "Phòng chuyên dụng", typeId: 6, capacity: 15, status: "active", facilityStatus: "available", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600", building: "Tòa Gamma", floor: 1 },
    ];

    let filtered = [...allRooms];

    // Filter theo campus
    if (campusId && campusId !== "all") {
      filtered = filtered.filter(room => room.campus === campusId);
    }

    // Filter theo loại phòng
    if (facilityTypeId) {
      filtered = filtered.filter(room => room.typeId === facilityTypeId);
    }

    // Filter theo sức chứa
    if (minCapacity) {
      filtered = filtered.filter(room => room.capacity >= minCapacity);
    }
    if (maxCapacity) {
      filtered = filtered.filter(room => room.capacity <= maxCapacity);
    }

    // Filter theo search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(room => 
        room.name.toLowerCase().includes(query) ||
        room.building.toLowerCase().includes(query)
      );
    }

    // Filter theo status (active/inactive/maintenance)
    if (status) {
      if (status === "active") {
        filtered = filtered.filter(room => room.status === "active" && room.facilityStatus !== "maintenance");
      } else if (status === "maintenance") {
        filtered = filtered.filter(room => room.facilityStatus === "maintenance");
      }
    } else {
      // Mặc định: Ẩn các phòng inactive và maintenance (theo business rule)
      filtered = filtered.filter(room => 
        room.status === "active" && room.facilityStatus !== "maintenance"
      );
    }

    return filtered;
  },

  // Lấy lịch biểu của phòng (theo ngày hoặc tuần)
  getRoomSchedule: async (facilityId, date, viewType = "day") => {
    await delay(500);
    
    // Mock data - Các slot trong ngày (7:00 - 22:00, mỗi slot 1.5 giờ)
    const slots = [
      { id: 1, start: "07:00", end: "08:30", label: "Slot 1" },
      { id: 2, start: "08:30", end: "10:00", label: "Slot 2" },
      { id: 3, start: "10:00", end: "11:30", label: "Slot 3" },
      { id: 4, start: "11:30", end: "13:00", label: "Slot 4" },
      { id: 5, start: "13:00", end: "14:30", label: "Slot 5" },
      { id: 6, start: "14:30", end: "16:00", label: "Slot 6" },
      { id: 7, start: "16:00", end: "17:30", label: "Slot 7" },
      { id: 8, start: "17:30", end: "19:00", label: "Slot 8" },
      { id: 9, start: "19:00", end: "20:30", label: "Slot 9" },
      { id: 10, start: "20:30", end: "22:00", label: "Slot 10" },
    ];

    // Mock bookings - Giả sử có một số booking đã được duyệt
    const mockBookings = [
      { id: 1, facilityId: facilityId, slotIds: [2, 3], status: "approved", userId: 100, userName: "Nguyễn Văn A", purpose: "Học nhóm" },
      { id: 2, facilityId: facilityId, slotIds: [6, 7], status: "approved", userId: 101, userName: "Trần Thị B", purpose: "Thuyết trình" },
      { id: 3, facilityId: facilityId, slotIds: [5], status: "pending", userId: 102, userName: "Lê Văn C", purpose: "Tự học" },
    ];

    return {
      facilityId,
      date,
      viewType,
      slots,
      bookings: mockBookings.filter(b => b.facilityId === facilityId),
    };
  },

  // Lấy danh sách booking để kiểm tra overlap
  getBookings: async (filters = {}) => {
    await delay(400);
    const { facilityId, date, status } = filters;
    
    // Mock bookings
    const mockBookings = [
      { id: 1, facilityId: 1, date: "2024-12-09", slotIds: [2, 3], status: "approved", userId: 100 },
      { id: 2, facilityId: 1, date: "2024-12-09", slotIds: [6, 7], status: "approved", userId: 101 },
      { id: 3, facilityId: 1, date: "2024-12-09", slotIds: [5], status: "pending", userId: 102 },
    ];

    let filtered = [...mockBookings];
    
    if (facilityId) {
      filtered = filtered.filter(b => b.facilityId === facilityId);
    }
    
    if (date) {
      filtered = filtered.filter(b => b.date === date);
    }
    
    if (status) {
      filtered = filtered.filter(b => b.status === status);
    }

    return filtered;
  },
  
  // Các hàm khác giữ nguyên
  createBooking: async (data) => { 
    await delay(1000); 
    return { 
      success: true, 
      bookingId: Math.floor(Math.random() * 10000),
      bookingCode: `#BK-${Math.floor(Math.random() * 10000)}`
    }; 
  },
  getMyBookings: async () => [],
  getPendingApprovals: async () => [],
  approveBooking: async () => ({ success: true }),
};