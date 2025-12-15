import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { cn } from "./lib/utils";

import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Footer from "./components/layout/Footer";

import ProtectedRoute from "./features/auth/ProtectedRoute";

// Pages
import Login from "./features/auth/Login";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";

// Booking
import RoomSearch from "./features/booking/RoomSearch"; // ✅ đây là trang Đặt phòng
import BookingForm from "./features/booking/BookingForm";
import MyBookings from "./features/booking/MyBookings";
import FacilityCatalog from "./features/booking/FacilityCatalog";
import ClubSuggestions from "./features/booking/ClubSuggestions";

// Admin
import ApprovalList from "./features/admin/ApprovalList";
import RoomManagement from "./features/admin/RoomManagement";
import EquipmentManagement from "./features/admin/EquipmentManagement";
import ClubManagement from "./features/admin/ClubManagement";
import HistoryLog from "./features/admin/HistoryLog";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const role = (user?.role || "").toLowerCase();
  const isFacilityAdmin = role === "facility_admin";
  const isCampusAdmin = role === "campus_admin";
  const isStudentLike = ["student", "lecturer", "club_leader"].includes(role);

  // ✅ Redirect nếu đang ở sai khu vực theo role
  // Facility Admin không được vào khu student
  if (
    isFacilityAdmin &&
    (location.pathname === "/dashboard" ||
      location.pathname === "/booking" ||
      location.pathname === "/history" ||
      location.pathname === "/facilities")
  ) {
    return <Navigate to="/admin-facility" replace />;
  }

  // Student không được vào khu facility admin
  if (isStudentLike && location.pathname.startsWith("/admin-facility")) {
    return <Navigate to="/dashboard" replace />;
  }

  // (tuỳ bạn) Student cũng không vào campus admin
  if (isStudentLike && location.pathname.startsWith("/admin-campus")) {
    return <Navigate to="/dashboard" replace />;
  }

  const isAdminPage =
    location.pathname.startsWith("/admin") || isFacilityAdmin || isCampusAdmin;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 relative items-stretch">
        <Sidebar isOpen={sidebarOpen} />

        <div
          className={cn(
            "flex-1 flex flex-col transition-all duration-300 min-h-[calc(100vh-64px)] w-full",
            sidebarOpen ? "lg:ml-64" : "lg:ml-0"
          )}
        >
          <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto">
            <Outlet />
          </main>

          {!isAdminPage && <Footer />}
        </div>
      </div>
    </div>
  );
};

// Pages đơn giản
const ForbiddenPage = () => <div className="text-center pt-20">403 - Forbidden</div>;
const NotFoundPage = () => <div className="text-center pt-20">404 - Not Found</div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Private Layout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              {/* Common */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* ===== STUDENT / LECTURER / CLUB_LEADER ===== */}
              <Route element={<ProtectedRoute roles={["STUDENT", "LECTURER", "CLUB_LEADER"]} />}>
                <Route path="dashboard" element={<DashboardPage />} />

                {/* ✅ ĐÚNG theo Sidebar mới */}
                <Route path="booking" element={<RoomSearch />} />
                <Route path="facilities" element={<FacilityCatalog />} />
                <Route path="history" element={<MyBookings />} />

                {/* giữ các route cũ nếu bạn còn dùng */}
                <Route path="booking/create" element={<BookingForm />} />
                <Route path="booking/my" element={<MyBookings />} />
                <Route path="booking/search" element={<RoomSearch />} />

                {/* CLUB_LEADER only */}
                <Route element={<ProtectedRoute roles={["CLUB_LEADER"]} />}>
                  <Route path="booking/club-suggestions" element={<ClubSuggestions />} />
                </Route>
              </Route>

              {/* ===== CAMPUS ADMIN ===== */}
              <Route element={<ProtectedRoute roles={["CAMPUS_ADMIN"]} />}>
                <Route path="admin-campus" element={<DashboardPage />} />
                <Route path="admin-campus/approvals" element={<ApprovalList />} />
              </Route>

              {/* ===== FACILITY ADMIN ===== */}
              <Route element={<ProtectedRoute roles={["FACILITY_ADMIN"]} />}>
                <Route path="admin-facility" element={<Navigate to="/admin-facility/approvals" replace />} />
                <Route path="admin-facility/approvals" element={<ApprovalList />} />
                <Route path="admin-facility/rooms" element={<RoomManagement />} />
                <Route path="admin-facility/equipment" element={<EquipmentManagement />} />
                <Route path="admin-facility/clubs" element={<ClubManagement />} />
                <Route path="admin-facility/history" element={<HistoryLog />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
