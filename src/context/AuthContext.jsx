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
    try {
      const storedUser = localStorage.getItem("fptu_user");
      const storedToken = localStorage.getItem("access_token");
      
      // Nếu có user và token thì set user, nếu không thì clear hết
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      } else {
        // Clear nếu thiếu token hoặc user
        localStorage.removeItem("fptu_user");
        localStorage.removeItem("access_token");
        setUser(null);
      }
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
      localStorage.removeItem("fptu_user");
      localStorage.removeItem("access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login theo swagger: POST /auth/login
  // campusId: number (1,2,3...) theo backend
  const login = async (email, password, campusId) => {
    const data = await authService.login({ email, password, campusId });
    // data: { message, token, user }
    const backendUser = data?.user || null;

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

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, refreshProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
