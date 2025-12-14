/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user từ localStorage trước
  useEffect(() => {
    const storedUser = localStorage.getItem("fptu_user");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  // Login theo swagger: POST /auth/login
  // campusId: number (1,2,3...) theo backend
 const login = async (email, password, campusId) => {
  const data = await authService.login({ email, password, campusId });
  const backendUser = data?.user || null;
  const token = data?.token;

  if (token) localStorage.setItem("access_token", token);

  if (backendUser) {
    setUser(backendUser);
    localStorage.setItem("fptu_user", JSON.stringify(backendUser));
  }

  return data;
};

  // Refresh user từ backend: GET /auth/profile
  const refreshProfile = async () => {
    const profile = await authService.getProfile();
    setUser(profile);
    localStorage.setItem("fptu_user", JSON.stringify(profile));
    return profile;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fptu_user");
    localStorage.removeItem("access_token");
  };

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated, login, logout, refreshProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
