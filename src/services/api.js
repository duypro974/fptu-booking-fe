/* eslint-disable no-unused-vars */
// src/services/api.js

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // --- 1. FACILITY ADMIN (Quản lý phòng tại Campus + Duyệt booking) ---
    if (email.includes("facility.") || email.includes("admin")) {
      userRole = "facility_admin";
      
      // Xác định campus CỐ ĐỊNH của Facility Admin dựa vào email
      let assignedCampusId = "";
      if (email.includes("hcm")) assignedCampusId = "hcm";
      else if (email.includes("hn")) assignedCampusId = "hn";
      else assignedCampusId = selectedCampusId; // Nếu không detect được thì dùng campus đã chọn

      // Nếu có campus cụ thể trong email, kiểm tra
      if (assignedCampusId && assignedCampusId !== selectedCampusId && (email.includes("hcm") || email.includes("hn"))) {
        throw new Error(
          `Lỗi: Tài khoản Facility Admin này chỉ có quyền truy cập ${assignedCampusId.toUpperCase()}, không thể đăng nhập vào ${selectedCampusName}.`
        );
      }

      campusName = selectedCampusName;
      selectedCampusId = assignedCampusId || selectedCampusId;
    } 
    
    // --- 2. SINH VIÊN (Thoải mái) ---
    else {
      userRole = "student";
      campusName = selectedCampusName;
    }

    // Trả về kết quả thành công
    const roleNames = {
      student: "Nguyễn Văn Sinh Viên",
      facility_admin: "Nhân viên Quản lý Phòng"
    };

    return { 
      id: 123,
      name: roleNames[userRole] || "Người dùng",
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
  // TODO: Nối API thật sau - Các endpoint này sẽ gọi backend thực tế
  // Khi nối API, thay thế toàn bộ logic bên dưới bằng fetch() calls
  
  // Room Management
  getAllRooms: async (campusId = "all") => {
    await delay(600);
    // TODO: GET /api/rooms?campusId={campusId}
    // const response = await fetch(`/api/rooms?campusId=${campusId}`);
    // return await response.json();
    
    if (campusId === "all") return [...mockRooms];
    return mockRooms.filter(room => room.campus === campusId);
  },

  createRoom: async (data) => {
    await delay(800);
    // TODO: POST /api/rooms
    // const response = await fetch('/api/rooms', { 
    //   method: 'POST', 
    //   body: JSON.stringify(data), 
    //   headers: { 'Content-Type': 'application/json' } 
    // });
    // return await response.json();
    
    const newRoom = {
      id: nextRoomId++,
      ...data,
    };
    mockRooms.push(newRoom);
    updateEquipmentRoomNames();
    updateClubRoomNames();
    return { success: true, id: newRoom.id };
  },

  updateRoom: async (id, data) => {
    await delay(800);
    // TODO: PUT /api/rooms/{id}
    // const response = await fetch(`/api/rooms/${id}`, { 
    //   method: 'PUT', 
    //   body: JSON.stringify(data), 
    //   headers: { 'Content-Type': 'application/json' } 
    // });
    // return await response.json();
    
    const index = mockRooms.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Room not found");
    
    mockRooms[index] = { ...mockRooms[index], ...data };
    updateEquipmentRoomNames();
    updateClubRoomNames();
    return { success: true };
  },

  deleteRoom: async (id) => {
    await delay(600);
    // TODO: DELETE /api/rooms/{id}
    // const response = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
    // return await response.json();
    
    const index = mockRooms.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Room not found");
    
    mockRooms.splice(index, 1);
    // Xóa equipment và club references
    mockEquipment = mockEquipment.filter(eq => eq.roomId !== id);
    mockClubs.forEach(club => {
      club.priorityRoomIds = club.priorityRoomIds.filter(rid => rid !== id);
    });
    updateClubRoomNames();
    return { success: true };
  },

  // Equipment Management
  getAllEquipment: async (campusId = null) => {
    await delay(600);
    // TODO: GET /api/equipment?campusId={campusId}
    // const response = await fetch(`/api/equipment${campusId ? `?campusId=${campusId}` : ''}`);
    // return await response.json();
    
    // Đảm bảo roomName được cập nhật
    updateEquipmentRoomNames();
    
    // Nếu có campusId, filter equipment theo rooms thuộc campus đó
    if (campusId && campusId !== "all") {
      const campusRoomIds = mockRooms
        .filter(room => room.campus === campusId)
        .map(room => room.id);
      return mockEquipment.filter(eq => !eq.roomId || campusRoomIds.includes(eq.roomId));
    }
    
    return [...mockEquipment];
  },

  createEquipment: async (data) => {
    await delay(800);
    // TODO: POST /api/equipment
    // const response = await fetch('/api/equipment', { 
    //   method: 'POST', 
    //   body: JSON.stringify(data), 
    //   headers: { 'Content-Type': 'application/json' } 
    // });
    // return await response.json();
    
    const room = data.roomId ? mockRooms.find(r => r.id === data.roomId) : null;
    const newEquipment = {
      id: nextEquipmentId++,
      ...data,
      roomName: room ? room.name : null,
    };
    mockEquipment.push(newEquipment);
    return { success: true, id: newEquipment.id };
  },

  updateEquipment: async (id, data) => {
    await delay(800);
    // TODO: PUT /api/equipment/{id}
    // const response = await fetch(`/api/equipment/${id}`, { 
    //   method: 'PUT', 
    //   body: JSON.stringify(data), 
    //   headers: { 'Content-Type': 'application/json' } 
    // });
    // return await response.json();
    
    const index = mockEquipment.findIndex(eq => eq.id === id);
    if (index === -1) throw new Error("Equipment not found");
    
    const room = data.roomId ? mockRooms.find(r => r.id === data.roomId) : null;
    mockEquipment[index] = {
      ...mockEquipment[index],
      ...data,
      roomName: room ? room.name : null,
    };
    return { success: true };
  },

  deleteEquipment: async (id) => {
    await delay(600);
    // TODO: DELETE /api/equipment/{id}
    // const response = await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
    // return await response.json();
    
    const index = mockEquipment.findIndex(eq => eq.id === id);
    if (index === -1) throw new Error("Equipment not found");
    
    mockEquipment.splice(index, 1);
    return { success: true };
  },

  // Club Management
  getAllClubs: async (campusId = null) => {
    await delay(600);
    // TODO: GET /api/clubs?campusId={campusId}
    // const response = await fetch(`/api/clubs${campusId ? `?campusId=${campusId}` : ''}`);
    // return await response.json();
    
    // Đảm bảo priorityRoomNames được cập nhật
    updateClubRoomNames();
    
    // Nếu có campusId, filter clubs có priority rooms thuộc campus đó
    if (campusId && campusId !== "all") {
      const campusRoomIds = mockRooms
        .filter(room => room.campus === campusId)
        .map(room => room.id);
      return mockClubs.filter(club => 
        club.priorityRoomIds && club.priorityRoomIds.some(roomId => campusRoomIds.includes(roomId))
      );
    }
    
    return [...mockClubs];
  },

  createClub: async (data) => {
    await delay(800);
    // TODO: POST /api/clubs
    // Body: { name, description, priorityRoomIds: [] }
    // const response = await fetch('/api/clubs', { 
    //   method: 'POST', 
    //   body: JSON.stringify(data), 
    //   headers: { 'Content-Type': 'application/json' } 
    // });
    // return await response.json();
    
    const priorityRoomNames = (data.priorityRoomIds || [])
      .map(roomId => {
        const room = mockRooms.find(r => r.id === roomId);
        return room ? room.name : null;
      })
      .filter(name => name !== null);
    
    const newClub = {
      id: nextClubId++,
      name: data.name,
      description: data.description || "",
      leaderCount: 0, // Mặc định chưa có leader
      priorityRoomIds: data.priorityRoomIds || [],
      priorityRoomNames: priorityRoomNames,
    };
    mockClubs.push(newClub);
    return { success: true, id: newClub.id };
  },

  updateClub: async (id, data) => {
    await delay(800);
    // TODO: PUT /api/clubs/{id}
    // Body: { name, description, priorityRoomIds: [] }
    // const response = await fetch(`/api/clubs/${id}`, { 
    //   method: 'PUT', 
    //   body: JSON.stringify(data), 
    //   headers: { 'Content-Type': 'application/json' } 
    // });
    // return await response.json();
    
    const index = mockClubs.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Club not found");
    
    const priorityRoomNames = (data.priorityRoomIds || [])
      .map(roomId => {
        const room = mockRooms.find(r => r.id === roomId);
        return room ? room.name : null;
      })
      .filter(name => name !== null);
    
    mockClubs[index] = {
      ...mockClubs[index],
      name: data.name,
      description: data.description || "",
      priorityRoomIds: data.priorityRoomIds || [],
      priorityRoomNames: priorityRoomNames,
    };
    return { success: true };
  },

  deleteClub: async (id) => {
    await delay(600);
    // TODO: DELETE /api/clubs/{id}
    // const response = await fetch(`/api/clubs/${id}`, { method: 'DELETE' });
    // return await response.json();
    
    const index = mockClubs.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Club not found");
    
    mockClubs.splice(index, 1);
    return { success: true };
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