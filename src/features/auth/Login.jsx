// src/features/auth/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  MapPin,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  ChevronDown,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";

const BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop";

// Campus mapping theo swagger campusId (VD: hn=1, hcm=2)
const CAMPUSES = [
  { id: 2, name: "FPTU TP.HCM (Quận 9)" },
  { id: 1, name: "FPTU Hòa Lạc (Hà Nội)" },
  // { id: 3, name: "FPTU Đà Nẵng" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // IMPORTANT: campusId là NUMBER
  const [campusId, setCampusId] = useState(2);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  const extractErrorMessage = (err) => {
    // Nếu AuthContext / axios đã throw new Error("...") thì dùng luôn
    if (err?.message && !err.message.includes("status code")) return err.message;

    // Trường hợp axios error chưa được handle: lấy message backend
    const apiMsg = err?.response?.data?.message;
    if (apiMsg) return apiMsg;

    return "Đăng nhập thất bại.";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate campusId trước
    if (!campusId || Number.isNaN(Number(campusId))) {
      setError("Vui lòng chọn cơ sở.");
      setLoading(false);
      return;
    }

    try {
      // AuthContext.login(email, password, campusId)
      // nên return { message, token, user } từ backend
      const data = await login(email, password, campusId);

      const role = String(data?.user?.role || "").toUpperCase();

      if (role === "FACILITY_ADMIN") {
        navigate("/admin-facility");
      } else if (role === "CAMPUS_ADMIN") {
        navigate("/admin-campus");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:flex-none lg:w-[500px] z-10 bg-white">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              FPTU Booking
            </h2>
            <p className="text-gray-500">Đăng nhập để tiếp tục.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* 1) Chọn Campus */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Cơ sở hoạt động
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>

                <select
                  value={campusId}
                  onChange={(e) => setCampusId(Number(e.target.value))}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none appearance-none cursor-pointer"
                >
                  {CAMPUSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-gray-400 mt-1.5 italic">
                *CampusId sẽ được gửi lên backend khi đăng nhập.
              </p>
            </div>

            {/* 2) Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email FPT
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="name@fpt.edu.vn"
                />
              </div>
            </div>

            {/* 3) Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 text-gray-400"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3 shadow-lg shadow-orange-200"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đăng nhập ngay"}
            </Button>
          </form>

          {/* Test Accounts */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => setShowTestAccounts(!showTestAccounts)}
              className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span className="font-medium">Tài khoản test</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showTestAccounts ? "rotate-180" : ""
                }`}
              />
            </button>

            {showTestAccounts && (
              <div className="mt-4 space-y-3 text-sm">
                <div
                  className="bg-orange-50 border border-orange-200 rounded-lg p-3 cursor-pointer hover:bg-orange-100 transition-colors"
                  onClick={() => {
                    setEmail("facility.hcm@fpt.edu.vn");
                    setPassword("123456");
                    setCampusId(2);
                  }}
                >
                  <p className="font-semibold text-orange-900 mb-2">
                    🏢 Facility Admin
                  </p>
                  <p className="text-orange-800 mb-1">
                    Email:{" "}
                    <code className="bg-white px-2 py-0.5 rounded text-xs">
                      facility.hcm@fpt.edu.vn
                    </code>
                  </p>
                  <p className="text-orange-700 text-xs">Password: 123456</p>
                  <p className="text-orange-500 text-xs mt-2 italic">
                    👆 Click để tự điền
                  </p>
                </div>

                <div
                  className="bg-green-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => {
                    setEmail("student@fpt.edu.vn");
                    setPassword("123456");
                    setCampusId(2);
                  }}
                >
                  <p className="font-semibold text-green-900 mb-2">
                    👨‍🎓 Student
                  </p>
                  <p className="text-green-800 mb-1">
                    Email:{" "}
                    <code className="bg-white px-2 py-0.5 rounded text-xs">
                      student@fpt.edu.vn
                    </code>
                  </p>
                  <p className="text-green-700 text-xs">Password: 123456</p>
                  <p className="text-green-500 text-xs mt-2 italic">
                    👆 Click để tự điền
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right image */}
      <div className="hidden lg:block relative flex-1">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={BACKGROUND_IMAGE}
          alt="FPT Campus"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/40 to-black/20 mix-blend-multiply"></div>
      </div>
    </div>
  );
}
