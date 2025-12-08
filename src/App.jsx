// src/App.jsx
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Login from "./features/auth/Login";
// Student Pages
import DashboardPage from "./pages/DashboardPage";
import RoomSearch from "./features/booking/RoomSearch";
import MyBookings from "./features/booking/MyBookings";
// Admin Pages
import AdminDashboard from "./features/admin/Dashboard";
import ApprovalList from "./features/admin/ApprovalList";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} />
        <main className="flex-1 lg:ml-64 p-6 md:p-8 transition-all"><Outlet /></main>
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
            {/* 1. KHU VỰC SINH VIÊN */}
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="booking" element={<RoomSearch />} />
            <Route path="history" element={<MyBookings />} />
            
            {/* 2. KHU VỰC CAMPUS ADMIN (STAFF) */}
            <Route path="admin-campus" element={<AdminDashboard />} />
            <Route path="admin-campus/approvals" element={<ApprovalList />} />
            <Route path="admin-campus/rooms" element={<div className="text-center pt-20">Quản lý Phòng (Staff)</div>} />

            {/* 3. KHU VỰC FACILITY ADMIN (BOSS) */}
            <Route path="admin-facility" element={<div className="text-center pt-20 font-bold text-2xl">Dashboard Toàn Hệ Thống (Sếp Tổng)</div>} />
            <Route path="admin-facility/users" element={<div className="text-center pt-20">Quản lý User</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;