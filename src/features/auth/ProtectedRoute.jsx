import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // normalize role
  const userRole = String(user?.role || "").toUpperCase();

  if (roles?.length) {
    const allow = roles.map(r => String(r).toUpperCase()).includes(userRole);
    if (!allow) return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
