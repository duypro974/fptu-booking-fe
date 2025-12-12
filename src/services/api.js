/* eslint-disable no-unused-vars */
// src/services/api.js

import { apiRequest } from '../config/api';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Map campus string (hcm, hn) sang campusId number cho backend
const getCampusId = (campus) => {
  if (typeof campus === 'number') return campus;
  const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
  return campusMap[campus?.toLowerCase()] || null;
};

// ========== MOCK STORE (In-Memory Database) ==========
// Dùng để test CRUD - Data sẽ mất khi refresh trang
// TODO: Khi nối API thật, xóa phần này và dùng API calls thực tế

let mockRooms = [
  { id: 1, campus: "hcm", name: "Phòng Seminar 201", type: "Học tập", capacity: 30, status: "active", description: "Phòng học nhóm hiện đại" },
  { id: 2, campus: "hcm", name: "Hội trường Alpha", type: "Sự kiện", capacity: 200, status: "active", description: "Hội trường lớn cho sự kiện" },
  { id: 3, campus: "hn", name: "Lab IoT 305", type: "Thực hành", capacity: 40, status: "active", description: "Phòng lab IoT" },
  { id: 4, campus: "hcm", name: "Phòng Họp 101", type: "Họp", capacity: 10, status: "maintenance", description: "Đang bảo trì" },
  { id: 5, campus: "dn", name: "Phòng Họp 101", type: "Họp", capacity: 10, status: "active", description: "" },
];

let mockEquipment = [
  { id: 1, name: "Máy chiếu Epson", roomId: 1, roomName: "Phòng Seminar 201", quantity: 2, status: "available", description: "Máy chiếu HD" },
  { id: 2, name: "Loa JBL", roomId: 2, roomName: "Hội trường Alpha", quantity: 4, status: "available", description: "Hệ thống loa công suất lớn" },
  { id: 3, name: "Bàn ghế di động", roomId: 1, roomName: "Phòng Seminar 201", quantity: 30, status: "available", description: "" },
  { id: 4, name: "Máy tính Dell", roomId: 3, roomName: "Lab IoT 305", quantity: 20, status: "maintenance", description: "Đang bảo trì" },
  { id: 5, name: "Bảng thông minh", roomId: null, roomName: null, quantity: 1, status: "available", description: "Chưa gán phòng" },
];

let mockClubs = [
  { 
    id: 1, 
    name: "CLB Nhạc", 
    description: "Câu lạc bộ âm nhạc FPTU", 
    leaderCount: 2,
    priorityRoomIds: [1, 2],
    priorityRoomNames: ["Phòng Seminar 201", "Hội trường Alpha"]
  },
  { 
    id: 2, 
    name: "CLB Thể thao", 
    description: "Câu lạc bộ thể thao đa dạng", 
    leaderCount: 3,
    priorityRoomIds: [2],
    priorityRoomNames: ["Hội trường Alpha"]
  },
  { 
    id: 3, 
    name: "CLB Công nghệ", 
    description: "", 
    leaderCount: 1,
    priorityRoomIds: [3],
    priorityRoomNames: ["Lab IoT 305"]
  },
];

let nextRoomId = 6;
let nextEquipmentId = 6;
let nextClubId = 4;

// Mock store cho history (lịch sử thay đổi)
let mockHistory = [];
let nextHistoryId = 1;

// Helper function để format timestamp
const formatTimestamp = () => {
  const now = new Date();
  return now.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// Mock store cho pending bookings (để test reject/approve)
let mockPendingApprovals = [
  {
    id: 1,
    bookingCode: "BK-001",
    roomName: "Phòng Seminar 201",
    roomId: 1,
    campus: "hcm",
    date: "2024-01-15",
    startTime: "08:00",
    endTime: "10:00",
    userName: "Nguyễn Văn A",
    userEmail: "nguyenvana@fpt.edu.vn",
    participantCount: 5,
    reason: "Học nhóm môn Lập trình Web",
    priorityReason: null,
    isEvent: false,
    isRecurring: false,
    supportRequest: null,
    createdAt: "2024-01-10T10:00:00Z"
  },
  {
    id: 2,
    bookingCode: "BK-002",
    roomName: "Hội trường Alpha",
    roomId: 2,
    campus: "hcm",
    date: "2024-01-16",
    startTime: "14:00",
    endTime: "17:00",
    userName: "Trần Thị B",
    userEmail: "tranthib@fpt.edu.vn",
    participantCount: 50,
    reason: "Sự kiện CLB Nhạc - Biểu diễn cuối kỳ",
    priorityReason: "CLB Nhạc được ưu tiên sử dụng Hội trường Alpha",
    isEvent: true,
    isRecurring: false,
    supportRequest: "Cần hệ thống âm thanh và ánh sáng",
    createdAt: "2024-01-10T11:00:00Z"
  },
  {
    id: 3,
    bookingCode: "BK-003",
    roomName: "Phòng Seminar 201", // CÙNG PHÒNG với booking 1
    roomId: 1, // CÙNG roomId
    campus: "hcm",
    date: "2024-01-15", // CÙNG NGÀY
    startTime: "08:00", // CÙNG GIỜ
    endTime: "10:00",
    userName: "Lê Văn C",
    userEmail: "levanc@fpt.edu.vn",
    participantCount: 20,
    reason: "Học nhóm môn Database",
    priorityReason: null,
    isEvent: false,
    isRecurring: false,
    supportRequest: null,
    createdAt: "2024-01-10T12:00:00Z" // Tạo sau booking 1
  },
  {
    id: 4,
    bookingCode: "BK-004",
    roomName: "Phòng Seminar 201", // CÙNG PHÒNG với booking 1
    roomId: 1,
    campus: "hcm",
    date: "2024-01-15", // CÙNG NGÀY
    startTime: "09:00", // TRÙNG MỘT PHẦN (09:00-11:00 overlap với 08:00-10:00)
    endTime: "11:00",
    userName: "Phạm Thị D",
    userEmail: "phamthid@fpt.edu.vn",
    participantCount: 8,
    reason: "Thuyết trình nhóm",
    priorityReason: null,
    isEvent: false,
    isRecurring: false,
    supportRequest: null,
    createdAt: "2024-01-10T13:00:00Z"
  }
];

// Helper function để cập nhật roomName trong equipment khi room thay đổi
const updateEquipmentRoomNames = () => {
  mockEquipment.forEach(eq => {
    if (eq.roomId) {
      const room = mockRooms.find(r => r.id === eq.roomId);
      eq.roomName = room ? room.name : null;
    } else {
      eq.roomName = null;
    }
  });
};

// Helper function để cập nhật priorityRoomNames trong clubs khi room thay đổi
const updateClubRoomNames = () => {
  mockClubs.forEach(club => {
    if (club.priorityRoomIds && club.priorityRoomIds.length > 0) {
      club.priorityRoomNames = club.priorityRoomIds
        .map(roomId => {
          const room = mockRooms.find(r => r.id === roomId);
          return room ? room.name : null;
        })
        .filter(name => name !== null);
    } else {
      club.priorityRoomNames = [];
    }
  });
};

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
    
    // Lấy thông tin campus mà người dùng ĐANG CHỌN ở dropdown
    const selectedCampusName = api.getCampuses().find(c => c.id === selectedCampusId)?.name;

    // --- 1. ADMIN TỔNG (Quyền cao nhất - Vào đâu cũng được hoặc vào Dashboard tổng) ---
    if (email.includes("admin")) {
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

  // ========== BOOKING APPROVAL APIs ==========
  // TODO: Nối API thật sau
  
  getPendingApprovals: async (campusId) => {
    await delay(600);
    // TODO: GET /api/bookings/pending?campusId={campusId}
    // const response = await fetch(`/api/bookings/pending?campusId=${campusId}`);
    // return await response.json();
    
    // Trả về từ mock store, filter theo campus
    return mockPendingApprovals.filter(booking => booking.campus === campusId);
  },

  checkBookingConflicts: async (bookingId, campusId) => {
    await delay(400);
    // TODO: GET /api/bookings/{bookingId}/conflicts?campusId={campusId}
    // const response = await fetch(`/api/bookings/${bookingId}/conflicts?campusId=${campusId}`);
    // return await response.json();
    
    // Mock: Tìm các booking PENDING trùng lịch (cùng phòng, cùng ngày, trùng giờ)
    // Logic: StartA < EndB && EndA > StartB
    const allPending = mockPendingApprovals.filter(b => b.campus === campusId);
    const currentBooking = allPending.find(b => b.id === bookingId);
    
    if (!currentBooking) return [];
    
    const conflicts = allPending.filter(booking => {
      // Bỏ qua chính nó
      if (booking.id === bookingId) return false;
      
      // Phải cùng phòng
      if (booking.roomId !== currentBooking.roomId) return false;
      
      // Phải cùng ngày
      if (booking.date !== currentBooking.date) return false;
      
      // Kiểm tra trùng giờ: StartA < EndB && EndA > StartB
      const startA = currentBooking.startTime;
      const endA = currentBooking.endTime;
      const startB = booking.startTime;
      const endB = booking.endTime;
      
      return startA < endB && endA > startB;
    });
    
    return conflicts.map(c => ({
      id: c.id,
      bookingCode: c.bookingCode,
      userName: c.userName,
      startTime: c.startTime,
      endTime: c.endTime,
      createdAt: c.createdAt // Thêm createdAt để so sánh thứ tự
    })).sort((a, b) => {
      // Sắp xếp conflict theo thời gian tạo (đơn cũ hơn lên trước)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  },

  approveBooking: async (bookingId, campusId, userName = "Admin") => {
    await delay(800);
    // TODO: POST /api/bookings/{bookingId}/approve
    // Body: { campusId }
    // const response = await fetch(`/api/bookings/${bookingId}/approve`, {
    //   method: 'POST',
    //   body: JSON.stringify({ campusId }),
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // return await response.json();
    
    // Logic: 
    // 1. Update booking status = APPROVED
    // 2. Tìm các booking PENDING trùng lịch -> Auto-reject
    // 3. Log vào BookingHistory
    // 4. Gửi notification
    
    // Xóa booking đã được approve khỏi danh sách pending
    const bookingIndex = mockPendingApprovals.findIndex(b => b.id === bookingId);
    if (bookingIndex !== -1) {
      const approvedBooking = mockPendingApprovals[bookingIndex];
      
      // Tìm và tự động reject các booking conflict
      const conflicts = await api.checkBookingConflicts(bookingId, campusId);
      conflicts.forEach(conflict => {
        const conflictIndex = mockPendingApprovals.findIndex(b => b.id === conflict.id);
        if (conflictIndex !== -1) {
          const conflictBooking = mockPendingApprovals[conflictIndex];
          // Log auto-reject vào history
          mockHistory.unshift({
            id: nextHistoryId++,
            action: "Từ chối đơn đặt phòng (Tự động)",
            entityType: "booking",
            entityName: `${conflictBooking.roomName} - ${conflictBooking.bookingCode}`,
            entityId: conflictBooking.id,
            changes: `Đơn bị từ chối tự động do trùng lịch với đơn #${approvedBooking.bookingCode} đã được duyệt`,
            oldValue: `Trạng thái: Chờ duyệt - ${conflictBooking.date} ${conflictBooking.startTime}-${conflictBooking.endTime}`,
            newValue: "Trạng thái: Từ chối (Tự động)",
            userName: userName,
            userEmail: `${userName.toLowerCase().replace(/\s+/g, '.')}@fpt.edu.vn`,
            timestamp: formatTimestamp()
          });
          mockPendingApprovals.splice(conflictIndex, 1);
        }
      });
      
      // Log approve vào history
      mockHistory.unshift({
        id: nextHistoryId++,
        action: "Duyệt đơn đặt phòng",
        entityType: "booking",
        entityName: `${approvedBooking.roomName} - ${approvedBooking.bookingCode}`,
        entityId: approvedBooking.id,
        changes: `Đơn đặt phòng đã được duyệt${conflicts.length > 0 ? ` (${conflicts.length} đơn trùng lịch đã bị tự động từ chối)` : ''}`,
        oldValue: `Trạng thái: Chờ duyệt - ${approvedBooking.date} ${approvedBooking.startTime}-${approvedBooking.endTime}`,
        newValue: `Trạng thái: Đã duyệt - Người đặt: ${approvedBooking.userName}`,
        userName: userName,
        userEmail: `${userName.toLowerCase().replace(/\s+/g, '.')}@fpt.edu.vn`,
        timestamp: formatTimestamp()
      });
      
      // Xóa booking đã approve
      mockPendingApprovals.splice(bookingIndex, 1);
    }
    
    return { success: true };
  },

  rejectBooking: async (bookingId, reason, userName = "Admin") => {
    await delay(800);
    // TODO: POST /api/bookings/{bookingId}/reject
    // Body: { reason }
    // const response = await fetch(`/api/bookings/${bookingId}/reject`, {
    //   method: 'POST',
    //   body: JSON.stringify({ reason }),
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // return await response.json();
    
    // Logic:
    // 1. Update booking status = REJECTED
    // 2. Log vào BookingHistory với rejectReason
    // 3. Gửi notification
    
    // Xóa booking đã bị reject khỏi danh sách pending
    const bookingIndex = mockPendingApprovals.findIndex(b => b.id === bookingId);
    if (bookingIndex !== -1) {
      const rejectedBooking = mockPendingApprovals[bookingIndex];
      
      // Log reject vào history
      mockHistory.unshift({
        id: nextHistoryId++,
        action: "Từ chối đơn đặt phòng",
        entityType: "booking",
        entityName: `${rejectedBooking.roomName} - ${rejectedBooking.bookingCode}`,
        entityId: rejectedBooking.id,
        changes: `Đơn đặt phòng đã bị từ chối. Lý do: ${reason}`,
        oldValue: `Trạng thái: Chờ duyệt - ${rejectedBooking.date} ${rejectedBooking.startTime}-${rejectedBooking.endTime}`,
        newValue: `Trạng thái: Từ chối - Lý do: ${reason}`,
        userName: userName,
        userEmail: `${userName.toLowerCase().replace(/\s+/g, '.')}@fpt.edu.vn`,
        timestamp: formatTimestamp()
      });
      
      mockPendingApprovals.splice(bookingIndex, 1);
    }
    
    return { success: true };
  },

  // ========== RESOURCE MANAGEMENT APIs ==========
  
  // Facility Types
  getFacilityTypes: async () => {
    try {
      const types = await apiRequest('/facility-types');
      return types.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || "",
      }));
    } catch (error) {
      console.error('[getFacilityTypes] Error:', error);
      // Fallback: return default types
      return [
        { id: 1, name: "Học tập", description: "" },
        { id: 2, name: "Sự kiện", description: "" },
        { id: 3, name: "Thực hành", description: "" },
        { id: 4, name: "Họp", description: "" },
        { id: 5, name: "Lab", description: "" },
        { id: 6, name: "Khác", description: "" },
      ];
    }
  },
  
  // Room Management
  getAllRooms: async (campusId = "all") => {
    try {
      const campusIdNum = campusId === "all" ? null : getCampusId(campusId);
      // Đảm bảo campusIdNum là number, không phải string
      const endpoint = campusIdNum !== null && campusIdNum !== undefined 
        ? `/facilities?campusId=${Number(campusIdNum)}` 
        : '/facilities';
      console.log('[getAllRooms] Calling endpoint:', endpoint, 'campusIdNum:', campusIdNum, 'type:', typeof campusIdNum);
      const facilities = await apiRequest(endpoint);
      console.log('[getAllRooms] Backend response (first facility):', facilities[0]);
      
      // Map backend format sang frontend format
      return facilities.map(f => {
        // Backend có thể trả về status (String) hoặc isActive (Boolean)
        let status = "inactive";
        if (f.status) {
          // Nếu có status field (String), normalize về lowercase
          const statusLower = f.status.toLowerCase();
          if (statusLower === "active" || statusLower === "available") {
            status = "active";
          } else if (statusLower === "maintenance" || statusLower === "maintainance") {
            status = "maintenance";
          } else {
            status = "inactive";
          }
        } else if (f.isActive !== undefined) {
          // Nếu có isActive field (Boolean)
          status = f.isActive ? "active" : "inactive";
        }
        
        // Xử lý type: backend có thể trả về f.type (object) hoặc f.facilityType (object) hoặc f.type (string)
        let typeName = "Khác";
        if (f.type) {
          if (typeof f.type === 'object' && f.type.name) {
            typeName = f.type.name; // Backend include relation
          } else if (typeof f.type === 'string') {
            typeName = f.type; // Backend trả về string
          }
        } else if (f.facilityType) {
          if (typeof f.facilityType === 'object' && f.facilityType.name) {
            typeName = f.facilityType.name; // Backend include relation với tên khác
          } else if (typeof f.facilityType === 'string') {
            typeName = f.facilityType; // Backend trả về string
          }
        }
        
        return {
          id: f.id,
          name: f.name,
          campus: campusId, // Giữ nguyên campus string cho frontend
          type: typeName,
          capacity: f.capacity || 0,
          status: status,
          description: f.description || "",
        };
      });
    } catch (error) {
      console.error('[getAllRooms] Error:', error);
      throw error;
    }
  },

  createRoom: async (data) => {
    try {
      const campusIdNum = getCampusId(data.campus);
      if (!campusIdNum) throw new Error("Invalid campus");
      
      // Tìm facilityTypeId từ type name
      const facilityTypes = await apiRequest('/facility-types');
      const facilityType = facilityTypes.find(ft => ft.name === data.type);
      if (!facilityType) throw new Error(`Facility type "${data.type}" not found`);
      
      const response = await apiRequest('/facilities', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          campusId: campusIdNum,
          facilityTypeId: facilityType.id,
          capacity: parseInt(data.capacity) || 0,
          description: data.description || "",
          isActive: data.status === "active",
        }),
      });
      
      return { success: true, id: response.id };
    } catch (error) {
      console.error('[createRoom] Error:', error);
      throw error;
    }
  },

  updateRoom: async (id, data) => {
    try {
      // Không gửi campusId khi update vì Facility Admin không nên đổi campus của phòng
      // Backend sẽ xử lý facilityTypeId thành relation format
      
      // Tìm facilityTypeId từ type name
      const facilityTypes = await apiRequest('/facility-types');
      const facilityType = facilityTypes.find(ft => ft.name === data.type);
      if (!facilityType) throw new Error(`Facility type "${data.type}" not found`);
      
      // Map status sang format backend mong đợi
      let status = "ACTIVE";
      if (data.status === "maintenance") {
        status = "MAINTENANCE";
      } else if (data.status === "inactive") {
        status = "INACTIVE";
      }
      
      const updatePayload = {
        name: data.name,
        // Không gửi campusId - giữ nguyên campus hiện tại
        facilityTypeId: facilityType.id, // Backend sẽ convert thành relation
        capacity: parseInt(data.capacity) || 0,
        description: data.description || "",
        status: status, // Gửi status thay vì isActive
      };
      
      console.log('[updateRoom] Update payload:', updatePayload);
      
      await apiRequest(`/facilities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      });
      
      return { success: true };
    } catch (error) {
      console.error('[updateRoom] Error:', error);
      throw error;
    }
  },

  deleteRoom: async (id) => {
    try {
      await apiRequest(`/facilities/${id}`, { method: 'DELETE' });
      return { success: true };
    } catch (error) {
      console.error('[deleteRoom] Error:', error);
      throw error;
    }
  },

  // Equipment Management
  getAllEquipment: async (campusId = null) => {
    try {
      const campusIdNum = campusId && campusId !== "all" ? getCampusId(campusId) : null;
      const endpoint = campusIdNum ? `/equipment?campusId=${campusIdNum}` : '/equipment';
      const equipment = await apiRequest(endpoint);
      
      // Map backend format sang frontend format
      return equipment.map(eq => ({
        id: eq.id,
        name: eq.name,
        roomId: eq.facilityId || null,
        roomName: eq.facility?.name || null,
        quantity: eq.quantity || 1,
        status: eq.isActive ? "available" : "unavailable",
        description: eq.description || "",
      }));
    } catch (error) {
      console.error('[getAllEquipment] Error:', error);
      throw error;
    }
  },

  createEquipment: async (data) => {
    try {
      const response = await apiRequest('/equipment', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          facilityId: data.roomId || null,
          quantity: parseInt(data.quantity) || 1,
          description: data.description || "",
          isActive: data.status === "available",
        }),
      });
      
      return { success: true, id: response.id };
    } catch (error) {
      console.error('[createEquipment] Error:', error);
      throw error;
    }
  },

  updateEquipment: async (id, data) => {
    try {
      await apiRequest(`/equipment/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name,
          facilityId: data.roomId || null,
          quantity: parseInt(data.quantity) || 1,
          description: data.description || "",
          isActive: data.status === "available",
        }),
      });
      
      return { success: true };
    } catch (error) {
      console.error('[updateEquipment] Error:', error);
      throw error;
    }
  },

  deleteEquipment: async (id) => {
    try {
      await apiRequest(`/equipment/${id}`, { method: 'DELETE' });
      return { success: true };
    } catch (error) {
      console.error('[deleteEquipment] Error:', error);
      throw error;
    }
  },

  // Club Management
  getAllClubs: async (campusId = null) => {
    try {
      const campusIdNum = campusId && campusId !== "all" ? getCampusId(campusId) : null;
      // Thêm timestamp để tránh cache
      const timestamp = new Date().getTime();
      const endpoint = campusIdNum 
        ? `/clubs?campusId=${campusIdNum}&_t=${timestamp}` 
        : `/clubs?_t=${timestamp}`;
      const clubs = await apiRequest(endpoint);
      console.log('[getAllClubs] Backend response:', clubs);
      
      // Map backend format sang frontend format
      const mappedClubs = clubs.map(club => {
        console.log('[getAllClubs] Club:', club.id, 'priorities:', club.priorities);
        
        // Map priorities - kiểm tra nhiều format
        let priorityRoomIds = [];
        let priorityRoomNames = [];
        
        if (club.priorities && Array.isArray(club.priorities)) {
          priorityRoomIds = club.priorities
            .map(p => p.facilityId || p.facility?.id)
            .filter(id => id !== undefined && id !== null);
          
          priorityRoomNames = club.priorities
            .map(p => p.facility?.name || p.facilityName)
            .filter(name => name && name !== null && name !== undefined);
        }
        
        return {
          id: club.id,
          name: club.name,
          description: club.description || "",
          leaderCount: club.leaderId ? 1 : 0,
          leader: club.leader ? {
            id: club.leader.id,
            name: club.leader.fullName || club.leader.name,
            email: club.leader.email,
          } : null,
          priorityRoomIds: priorityRoomIds,
          priorityRoomNames: priorityRoomNames,
        };
      });
      console.log('[getAllClubs] Mapped clubs:', mappedClubs);
      return mappedClubs;
    } catch (error) {
      console.error('[getAllClubs] Error:', error);
      throw error;
    }
  },

  createClub: async (data) => {
    try {
      // Lấy campusId từ user hiện tại
      const currentUser = JSON.parse(localStorage.getItem('fptu_user') || '{}');
      const campusId = getCampusId(currentUser.campus || data.campus);
      if (!campusId) throw new Error("Invalid campus");
      
      const response = await apiRequest('/clubs', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          description: data.description || "",
          campusId: campusId,
        }),
      });
      
      // Nếu có priorityRoomIds, gán từng priority
      if (data.priorityRoomIds && data.priorityRoomIds.length > 0) {
        for (const facilityId of data.priorityRoomIds) {
          // Đảm bảo facilityId là number
          const facilityIdNum = Number(facilityId);
          if (!facilityIdNum || isNaN(facilityIdNum)) {
            console.error('[createClub] Invalid facilityId:', facilityId);
            continue;
          }
          await apiRequest(`/clubs/${response.id}/priorities`, {
            method: 'POST',
            body: JSON.stringify({
              facilityId: facilityIdNum,
              priorityScore: 1, // Default priority score
            }),
          });
        }
      }
      
      return { success: true, id: response.id };
    } catch (error) {
      console.error('[createClub] Error:', error);
      throw error;
    }
  },

  updateClub: async (id, data) => {
    try {
      // Đảm bảo id là number
      const clubId = Number(id);
      if (!clubId || isNaN(clubId)) {
        throw new Error(`Invalid club ID: ${id}`);
      }
      
      // Update club info
      await apiRequest(`/clubs/${clubId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name,
          description: data.description || "",
        }),
      });
      
      // Update priorities: Xóa tất cả priorities cũ, thêm priorities mới
      if (data.priorityRoomIds !== undefined) {
        try {
          console.log('[updateClub] Updating priorities for club:', clubId, 'priorityRoomIds:', data.priorityRoomIds);
          
          // Lấy danh sách priorities hiện tại
          const currentPriorities = await apiRequest(`/clubs/${clubId}/priorities`);
          console.log('[updateClub] Current priorities:', currentPriorities);
          
          // Xóa tất cả priorities cũ
          if (Array.isArray(currentPriorities) && currentPriorities.length > 0) {
            for (const priority of currentPriorities) {
              if (priority && priority.facilityId) {
                console.log('[updateClub] Deleting priority:', priority.facilityId);
                await apiRequest(`/clubs/${clubId}/priorities/${priority.facilityId}`, {
                  method: 'DELETE',
                });
              }
            }
          }
          
          // Thêm priorities mới
          if (Array.isArray(data.priorityRoomIds) && data.priorityRoomIds.length > 0) {
            for (const facilityId of data.priorityRoomIds) {
              // Đảm bảo facilityId là number
              const facilityIdNum = Number(facilityId);
              if (!facilityIdNum || isNaN(facilityIdNum)) {
                console.error('[updateClub] Invalid facilityId:', facilityId);
                continue;
              }
              console.log('[updateClub] Adding priority:', { clubId: clubId, facilityId: facilityIdNum });
              const result = await apiRequest(`/clubs/${clubId}/priorities`, {
                method: 'POST',
                body: JSON.stringify({
                  facilityId: facilityIdNum,
                  priorityScore: 1,
                }),
              });
              console.log('[updateClub] Priority added successfully:', result);
            }
          } else {
            console.log('[updateClub] No priorities to add (empty array)');
          }
        } catch (priorityError) {
          console.error('[updateClub] Error updating priorities:', priorityError);
          // Throw error để user biết có lỗi
          throw new Error(`Lỗi khi cập nhật phòng ưu tiên: ${priorityError.message}`);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('[updateClub] Error:', error);
      throw error;
    }
  },

  deleteClub: async (id) => {
    try {
      await apiRequest(`/clubs/${id}`, { method: 'DELETE' });
      return { success: true };
    } catch (error) {
      console.error('[deleteClub] Error:', error);
      throw error;
    }
  },

  // ========== STATISTICS & HISTORY APIs ==========
  // TODO: Nối API thật sau

  getStatistics: async (campusId, dateRange = "week") => {
    await delay(600);
    // TODO: GET /api/statistics?campusId={campusId}&dateRange={dateRange}
    // const response = await fetch(`/api/statistics?campusId=${campusId}&dateRange=${dateRange}`);
    // return await response.json();
    
    // Mock data
    return {
      totalBookings: 245,
      bookingChange: 12.5,
      occupancyRate: 78,
      occupancyChange: 5.2,
      activeRooms: 24,
      cancellationRate: 8.5,
      cancellationChange: -2.1,
      statusDistribution: {
        approved: 180,
        pending: 25,
        rejected: 20,
        cancelled: 20
      },
      bookingByType: {
        "Học tập": 120,
        "Sự kiện": 60,
        "Thực hành": 40,
        "Họp": 25
      },
      topRooms: [
        { id: 1, name: "Phòng Seminar 201", type: "Học tập", bookingCount: 45, occupancyRate: 85 },
        { id: 2, name: "Hội trường Alpha", type: "Sự kiện", bookingCount: 32, occupancyRate: 72 },
        { id: 3, name: "Lab IoT 305", type: "Thực hành", bookingCount: 28, occupancyRate: 68 }
      ]
    };
  },

  getRoomBookings: async (roomId) => {
    await delay(500);
    // TODO: GET /api/rooms/{roomId}/bookings
    // const response = await fetch(`/api/rooms/${roomId}/bookings`);
    // return await response.json();
    
    // Mock data
    return [
      {
        id: 101,
        bookingCode: "BK-101",
        userName: "Nguyễn Văn A",
        date: "2024-01-15",
        startTime: "08:00",
        endTime: "10:00",
        status: "approved",
        reason: "Học nhóm"
      },
      {
        id: 102,
        bookingCode: "BK-102",
        userName: "Trần Thị B",
        date: "2024-01-16",
        startTime: "14:00",
        endTime: "16:00",
        status: "pending",
        reason: "Thuyết trình"
      }
    ];
  },

  getRoomHistory: async (roomId) => {
    await delay(400);
    // TODO: GET /api/rooms/{roomId}/history
    // const response = await fetch(`/api/rooms/${roomId}/history`);
    // return await response.json();
    
    // Mock data
    return [
      {
        action: "Tạo phòng",
        changes: "Phòng được tạo mới",
        userName: "Admin HCM",
        timestamp: "10/01/2024 09:00"
      },
      {
        action: "Cập nhật sức chứa",
        changes: "Sức chứa: 25 → 30 người",
        userName: "Admin HCM",
        timestamp: "12/01/2024 14:30"
      },
      {
        action: "Thay đổi trạng thái",
        changes: "Trạng thái: active → maintenance",
        userName: "Admin HCM",
        timestamp: "13/01/2024 10:15"
      }
    ];
  },

  getEquipmentHistory: async (equipmentId) => {
    await delay(400);
    // TODO: GET /api/equipment/{equipmentId}/history
    return [
      {
        action: "Thêm thiết bị",
        changes: "Thiết bị được thêm vào phòng",
        userName: "Admin HCM",
        timestamp: "11/01/2024 11:00"
      },
      {
        action: "Cập nhật số lượng",
        changes: "Số lượng: 1 → 2 cái",
        userName: "Admin HCM",
        timestamp: "12/01/2024 15:20"
      }
    ];
  },

  getClubHistory: async (clubId) => {
    await delay(400);
    // TODO: GET /api/clubs/{clubId}/history
    return [
      {
        action: "Tạo CLB",
        changes: "CLB được tạo mới",
        userName: "Admin HCM",
        timestamp: "08/01/2024 10:00"
      },
      {
        action: "Thêm phòng ưu tiên",
        changes: "Thêm: Phòng Seminar 201, Hội trường Alpha",
        userName: "Admin HCM",
        timestamp: "09/01/2024 14:00"
      }
    ];
  },

  getAllHistory: async (campusId) => {
    await delay(500);
    // TODO: GET /api/history?campusId={campusId}
    // const response = await fetch(`/api/history?campusId=${campusId}`);
    // return await response.json();
    
    // Kết hợp mockHistory (dynamic) với static data (initial)
    const staticHistory = [
      {
        id: 1,
        action: "Tạo phòng mới",
        entityType: "room",
        entityName: "Phòng Họp 102",
        entityId: 6,
        changes: "Phòng được tạo với sức chứa 15 người, loại Họp",
        oldValue: null,
        newValue: "Tên: Phòng Họp 102, Loại: Họp, Sức chứa: 15, Trạng thái: active",
        userName: "Admin HCM",
        userEmail: "admin.hcm@fpt.edu.vn",
        timestamp: "15/01/2024 14:30"
      },
      {
        id: 2,
        action: "Cập nhật thiết bị",
        entityType: "equipment",
        entityName: "Máy chiếu Epson",
        entityId: 1,
        changes: "Cập nhật số lượng thiết bị",
        oldValue: "Số lượng: 2 cái",
        newValue: "Số lượng: 3 cái",
        userName: "Admin HCM",
        userEmail: "admin.hcm@fpt.edu.vn",
        timestamp: "15/01/2024 11:20"
      },
      {
        id: 3,
        action: "Thay đổi trạng thái phòng",
        entityType: "room",
        entityName: "Phòng Họp 101",
        entityId: 4,
        changes: "Chuyển phòng sang trạng thái bảo trì do sự cố điều hòa",
        oldValue: "Trạng thái: active",
        newValue: "Trạng thái: maintenance (Lý do: Bảo trì điều hòa)",
        userName: "Admin HCM",
        userEmail: "admin.hcm@fpt.edu.vn",
        timestamp: "14/01/2024 16:45"
      },
      {
        id: 4,
        action: "Cập nhật CLB",
        entityType: "club",
        entityName: "CLB Nhạc",
        entityId: 1,
        changes: "Thêm phòng ưu tiên cho CLB",
        oldValue: "Phòng ưu tiên: Phòng Seminar 201, Hội trường Alpha",
        newValue: "Phòng ưu tiên: Phòng Seminar 201, Hội trường Alpha, Lab Âm nhạc 301",
        userName: "Admin HCM",
        userEmail: "admin.hcm@fpt.edu.vn",
        timestamp: "14/01/2024 10:15"
      },
      {
        id: 5,
        action: "Xóa thiết bị",
        entityType: "equipment",
        entityName: "Bàn ghế cũ",
        entityId: 6,
        changes: "Thiết bị đã bị xóa khỏi hệ thống do hư hỏng nặng",
        oldValue: "Tên: Bàn ghế cũ, Phòng: Phòng Seminar 201, Số lượng: 10 cái",
        newValue: null,
        userName: "Admin HCM",
        userEmail: "admin.hcm@fpt.edu.vn",
        timestamp: "13/01/2024 09:00"
      },
      {
        id: 6,
        action: "Cập nhật phòng",
        entityType: "room",
        entityName: "Phòng Seminar 201",
        entityId: 1,
        changes: "Tăng sức chứa phòng để phục vụ nhu cầu",
        oldValue: "Sức chứa: 25 người",
        newValue: "Sức chứa: 30 người",
        userName: "Admin HCM",
        userEmail: "admin.hcm@fpt.edu.vn",
        timestamp: "12/01/2024 15:30"
      },
      {
        id: 7,
        action: "Gán thiết bị vào phòng",
        entityType: "equipment",
        entityName: "Bảng thông minh",
        entityId: 5,
        changes: "Thiết bị được gán vào phòng",
        oldValue: "Phòng: Chưa gán",
        newValue: "Phòng: Phòng Seminar 201",
        userName: "Admin HCM",
        userEmail: "admin.hcm@fpt.edu.vn",
        timestamp: "11/01/2024 13:20"
      },
      {
        id: 8,
        action: "Thêm Leader cho CLB",
        entityType: "club",
        entityName: "CLB Thể thao",
        entityId: 2,
        changes: "Cấp quyền Leader cho sinh viên",
        oldValue: "Số Leader: 2 người",
        newValue: "Số Leader: 3 người (Thêm: Nguyễn Văn D)",
        userName: "Admin HCM",
        userEmail: "admin.hcm@fpt.edu.vn",
        timestamp: "10/01/2024 16:00"
      }
    ];
    
    // Kết hợp static history với dynamic history (mockHistory), ưu tiên dynamic (gần đây hơn)
    // Filter theo campus nếu cần (booking có campus field)
    const allHistory = [...mockHistory, ...staticHistory];
    
    // Sắp xếp theo timestamp (mới nhất lên đầu) - parse timestamp để sort đúng
    return allHistory.sort((a, b) => {
      // Parse timestamp từ format "DD/MM/YYYY HH:mm" hoặc ISO string
      const parseTimestamp = (ts) => {
        if (ts.includes('T')) {
          // ISO format
          return new Date(ts).getTime();
        }
        // Format "DD/MM/YYYY HH:mm"
        const [datePart, timePart] = ts.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hour, minute] = timePart ? timePart.split(':') : ['00', '00'];
        return new Date(year, month - 1, day, hour, minute).getTime();
      };
      
      return parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp);
    });
  },
};