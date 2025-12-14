import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { cn } from "./lib/utils";

import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Footer from "./components/layout/Footer";

import ProtectedRoute from "./features/auth/ProtectedRoute";

// Pages
import Login from "./features/auth/Login";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";

// Booking (Part 2 & 3)
import RoomSearch from "./features/booking/RoomSearch";
import BookingForm from "./features/booking/BookingForm";
import MyBookings from "./features/booking/MyBookings";
import FacilityCatalog from "./features/booking/FacilityCatalog";
// Nếu bạn làm MW3:
import ClubSuggestions from "./features/booking/ClubSuggestions";

// Facility Admin
import ApprovalList from "./features/admin/ApprovalList";
import FacilityAdminDashboard from "./features/admin/FacilityAdminDashboard";
import ResourceManagement from "./features/admin/ResourceManagement";
import Statistics from "./features/admin/Statistics";
import HistoryLog from "./features/admin/HistoryLog";

// // Security
// import CheckInScanner from "./features/security/CheckInScanner";
// import DailySchedule from "./features/security/DailySchedule";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // Ẩn footer ở nhóm admin (chỉ dựa vào path)
  const isAdminPage = location.pathname.startsWith("/admin-facility") || location.pathname.startsWith("/admin");

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

          {/* Private Layout (cần đăng nhập) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              {/* Common */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* ===== Part 2: STUDENT & LECTURER (+ optional CLUB_LEADER) ===== */}
              <Route element={<ProtectedRoute roles={["STUDENT", "LECTURER", "CLUB_LEADER"]} />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="booking/facilities" element={<FacilityCatalog />} />
                <Route path="booking/search" element={<RoomSearch />} />
                <Route path="booking/create" element={<BookingForm />} />
                <Route path="booking/my" element={<MyBookings />} />

                {/* ===== Part 3: CLUB LEADER only (MW3) ===== */}
                <Route element={<ProtectedRoute roles={["CLUB_LEADER"]} />}>
                  <Route path="booking/club-suggestions" element={<ClubSuggestions />} />
                </Route>
              </Route>

              {/* ===== FACILITY ADMIN ===== */}
              <Route element={<ProtectedRoute roles={["FACILITY_ADMIN"]} />}>
                <Route path="admin-facility" element={<FacilityAdminDashboard />} />
                <Route path="admin-facility/resources" element={<ResourceManagement />} />
                <Route path="admin-facility/approvals" element={<ApprovalList />} />
                <Route path="admin-facility/statistics" element={<Statistics />} />
                <Route path="admin-facility/history" element={<HistoryLog />} />
              </Route>

              ===== SECURITY =====
              {/* <Route element={<ProtectedRoute roles={["SECURITY"]} />}>
                <Route path="security/checkin" element={<CheckInScanner />} />
                <Route path="security/schedule" element={<DailySchedule />} />
              </Route> */}
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
