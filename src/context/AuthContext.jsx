/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Đồng bộ user vào localStorage
   */
  const persistUser = (u) => {
    if (u) localStorage.setItem("fptu_user", JSON.stringify(u));
    else localStorage.removeItem("fptu_user");
  };

  /**
   * Đồng bộ token vào localStorage
   */
  const persistToken = (token) => {
    if (token) localStorage.setItem("access_token", token);
    else localStorage.removeItem("access_token");
  };

  /**
   * Load session lần đầu app mount
   * - Ưu tiên localStorage (nhanh)
   * - Nếu không có token/user -> thử gọi /auth/profile (hỗ trợ trường hợp cookie session)
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUserRaw = localStorage.getItem("fptu_user");
        const storedToken = localStorage.getItem("access_token");

        // 1) Nếu có cả user + token -> set nhanh
        if (storedUserRaw && storedToken) {
          try {
            const parsed = JSON.parse(storedUserRaw);
            setUser(parsed);
          } catch {
            // user bị hỏng -> clear
            localStorage.removeItem("fptu_user");
            setUser(null);
          } finally {
            setLoading(false);
          }

          // Optional verify token background (nếu muốn strict)
          // Bạn có thể bật lại nếu cần:
          // try { await authService.getProfile(); } catch { logout(); }

          return;
        }

        // 2) Nếu thiếu token/user: thử cookie session (nếu backend set cookie)
        // Nếu bạn chuyển hoàn toàn sang Bearer token thì phần này không bắt buộc,
        // nhưng giữ lại để không "mất" Google login kiểu cookie.
        console.log("[AuthContext] No local token/user, trying cookie session...");
        const profile = await authService.getProfile();

        if (profile) {
          console.log("[AuthContext] Session found via profile:", profile);
          setUser(profile);
          persistUser(profile);
        } else {
          setUser(null);
          persistUser(null);
          persistToken(null);
        }
      } catch (error) {
        console.log("[AuthContext] No valid session found.", error);
        setUser(null);
        persistUser(null);
        persistToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Login bằng email/password -> backend trả { token, user }
   */
  const login = async (email, password, campusId) => {
    const data = await authService.login({ email, password, campusId });
    const backendUser = data?.user || null;
    const token = data?.token;

    if (token) persistToken(token);
    if (backendUser) {
      setUser(backendUser);
      persistUser(backendUser);
    }

    return data;
  };

  /**
   * ✅ BẮT BUỘC: Dùng cho Google OAuth redirect về FE dạng:
   * /auth/callback?token=...
   *
   * Flow:
   * - Lưu token vào localStorage
   * - Gọi /auth/profile để lấy user mới nhất
   * - Set user + persist
   */
  const setTokenFromOAuth = async (token) => {
    if (!token) throw new Error("Missing OAuth token");

    persistToken(token);

    // Lấy profile để set user
    const profile = await authService.getProfile();
    if (!profile) {
      // token không hợp lệ hoặc BE không nhận -> clear
      persistToken(null);
      persistUser(null);
      setUser(null);
      throw new Error("OAuth token invalid or profile not found");
    }

    setUser(profile);
    persistUser(profile);
    return profile;
  };

  /**
   * Refresh profile (dùng khi cần sync lại user)
   */
  const refreshProfile = async () => {
    const profile = await authService.getProfile();
    setUser(profile);
    persistUser(profile);
    return profile;
  };

  /**
   * Logout local
   * (Nếu backend có endpoint logout để clear cookie thì gọi thêm ở đây)
   */
  const logout = async () => {
    setUser(null);
    persistUser(null);
    persistToken(null);

    // Nếu backend có logout để clear cookie:
    // try { await authService.logout(); } catch (e) { /* ignore */ }
  };

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      isAuthenticated,
      login,
      logout,
      refreshProfile,
      setTokenFromOAuth, // ✅ export ra để OAuthCallback dùng
    }),
    [user, loading, isAuthenticated]
  );

  return (
    <AuthContext.Provider value={value}>
      {/* nếu bạn muốn giữ UI loading thì render children luôn cũng được */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
