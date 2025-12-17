// api.js (fixed - keep original logic)

// Tự động thêm /api nếu URL từ env không có /api ở cuối
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || "http://localhost:6969";

  if (!envUrl.endsWith("/api")) {
    const finalUrl = envUrl.endsWith("/") ? `${envUrl}api` : `${envUrl}/api`;
    console.log(`[API Config] Auto-added /api to URL: ${envUrl} -> ${finalUrl}`);
    return finalUrl;
  }

  console.log(`[API Config] Using API URL: ${envUrl}`);
  return envUrl;
};

// ✅ Chỉ khai báo 1 lần
export const API_BASE_URL = getBaseUrl();

// Nếu project đang import cái tên này ở nơi khác thì giữ lại
export { API_BASE_URL as API_BASE_URL_EXPORT };

// Helper function để lấy token từ localStorage
export const getAuthToken = () => {
  return localStorage.getItem("access_token");
};

// Helper function để gọi API với authentication
export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();

  // Merge headers: default + options.headers
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    // ✅ Set 1 lần thôi
    headers["Authorization"] = `Bearer ${token}`;
    console.log(
      "[apiRequest] Token found, length:",
      token.length,
      "first 10 chars:",
      token.substring(0, 10) + "..."
    );
  } else {
    console.warn("[apiRequest] ⚠️ No token found in localStorage!");
  }

  // Timeout 30 giây
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    console.log(
      "[apiRequest] Calling:",
      `${API_BASE_URL}${endpoint}`,
      "with token:",
      token ? "Yes" : "No"
    );

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers,
      cache: "no-cache",
    });

    clearTimeout(timeoutId);
    console.log(
      "[apiRequest] Response status:",
      response.status,
      response.statusText
    );

    // Xử lý lỗi HTTP
    if (!response.ok) {
      // 401: token hết hạn/không hợp lệ -> clear localStorage
      if (response.status === 401) {
        localStorage.removeItem("fptu_user");
        localStorage.removeItem("access_token");
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      // 403: không có quyền / token không hợp lệ
      if (response.status === 403) {
        console.error(
          "[apiRequest] 403 Forbidden - Token có thể không hợp lệ hoặc không có quyền"
        );
        console.error("[apiRequest] Endpoint:", endpoint);
        console.error("[apiRequest] Token exists:", !!token);

        const errorData = await response
          .json()
          .catch(() => ({ message: "Bạn không có quyền thực hiện thao tác này." }));

        const errorMessage =
          errorData.message ||
          "Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại.";

        // Chỉ clear token + redirect nếu giống lỗi auth (không phải chỉ permission)
        if (
          errorMessage.includes("Token") ||
          errorMessage.includes("token") ||
          errorMessage.includes("đăng nhập lại")
        ) {
          localStorage.removeItem("fptu_user");
          localStorage.removeItem("access_token");

          if (typeof window !== "undefined") {
            if (!window.location.pathname.includes("/login")) {
              console.warn(
                "[apiRequest] Redirecting to login due to 403 authentication error"
              );
              window.location.href = "/login";
            }
          }
        }

        throw new Error(errorMessage);
      }

      // Các lỗi khác
      const errorData = await response
        .json()
        .catch(() => ({ message: "Có lỗi xảy ra" }));

      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Nếu response không phải JSON (hiếm), tránh crash
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    // Timeout
    if (error?.name === "AbortError") {
      throw new Error(
        "TIMEOUT_ERROR: Request timeout sau 30 giây. Vui lòng thử lại."
      );
    }

    // Lỗi network (fetch failed)
    if (error?.name === "TypeError") {
      const msg = String(error.message || "");
      if (msg.toLowerCase().includes("fetch")) {
        throw new Error(
          "CONNECTION_ERROR: Backend không khả dụng. Vui lòng kiểm tra backend có đang chạy không."
        );
      }
    }

    throw error;
  }
};
