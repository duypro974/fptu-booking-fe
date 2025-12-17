import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setTokenFromOAuth } = useAuth();

  useEffect(() => {
    const handleOAuth = async () => {
      const token = params.get("token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        // ✅ chỉ gọi 1 chỗ duy nhất
        await setTokenFromOAuth(token);

        // ✅ đợi user được set xong rồi mới redirect
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Google OAuth failed:", err);
        navigate("/login?error=google_login_failed", { replace: true });
      }
    };

    handleOAuth();
  }, [params, navigate, setTokenFromOAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      Đang đăng nhập bằng Google...
    </div>
  );
}
