import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { cn } from "./lib/utils"; // Import hàm cn để xử lý class động

import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Footer from "./components/layout/Footer";

// Pages
import Login from "./features/auth/Login";
import ProfilePage from "./pages/ProfilePage"; // Trang cá nhân mới tạo
import DashboardPage from "./pages/DashboardPage";
import RoomSearch from "./features/booking/RoomSearch";
import MyBookings from "./features/booking/MyBookings";
import ApprovalList from "./features/admin/ApprovalList";
import FacilityAdminDashboard from "./features/admin/FacilityAdminDashboard";
import ResourceManagement from "./features/admin/ResourceManagement";
import Statistics from "./features/admin/Statistics";
import HistoryLog from "./features/admin/HistoryLog";

const MainLayout = () => {
  // Mặc định Sidebar mở trên PC (true)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      
      {/* Header nhận function toggle */}
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 relative items-stretch">
        
        {/* Sidebar nhận state isOpen */}
        <Sidebar isOpen={sidebarOpen} />

        {/* WRAPPER NỘI DUNG CHÍNH 
            - Logic `ml-0` hoặc `ml-64`: Khi sidebar mở thì margin-left 64 (256px), đóng thì về 0.
            - `flex flex-col`: Để xếp dọc Nội dung và Footer.
            - `min-h-[...]`: Đảm bảo chiều cao tối thiểu để Footer luôn ở đáy.
        */}
        <div className={cn(
            "flex-1 flex flex-col transition-all duration-300 min-h-[calc(100vh-64px)] w-full",
            sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        )}>
          
          {/* Main Content: flex-1 để chiếm hết khoảng trống, đẩy Footer xuống */}
          <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto">
            <Outlet />
          </main>

          {/* Footer nằm dưới cùng */}
          <Footer />
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<MainLayout />}>
            {/* COMMON */}
            <Route path="profile" element={<ProfilePage />} />

            {/* STUDENT */}
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="booking" element={<RoomSearch />} />
            <Route path="history" element={<MyBookings />} />
            
            {/* FACILITY ADMIN (Quản lý Phòng tại Campus + Duyệt booking) */}
            <Route path="admin-facility" element={<FacilityAdminDashboard />} />
            <Route path="admin-facility/resources" element={<ResourceManagement />} />
            <Route path="admin-facility/approvals" element={<ApprovalList />} />
            <Route path="admin-facility/statistics" element={<Statistics />} />
            <Route path="admin-facility/history" element={<HistoryLog />} />
          </Route>
          
          <Route path="*" element={<div className="text-center pt-20">404 - Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;