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
    const normalizedRoles = roles.map(r => String(r).toUpperCase());
    const allow = normalizedRoles.includes(userRole);
    
    console.log('[ProtectedRoute] Checking access:', {
      userRole,
      requiredRoles: normalizedRoles,
      allow,
      path: location.pathname
    });
    
    if (!allow) {
      console.warn('[ProtectedRoute] Access denied - redirecting to /403');
      return <Navigate to="/403" replace />;
    }
  }

  return <Outlet />;
}
