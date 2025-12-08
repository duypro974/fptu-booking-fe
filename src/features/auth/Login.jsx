// src/features/auth/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, MapPin, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import Button from "../../components/ui/Button";

const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop"; 

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campus, setCampus] = useState("hcm"); 
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const campuses = api.getCampuses();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Gọi Login logic (Campus sẽ được xử lý lại bên trong api)
      const userData = await login(email, password, campus);
      
      // ĐIỀU HƯỚNG THEO 3 ROLE
      if (userData.role === 'facility_admin') {
        navigate("/admin-facility");
      } else if (userData.role === 'campus_admin') {
        navigate("/admin-campus");
      } else {
        navigate("/dashboard"); // Student
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:flex-none lg:w-[500px] z-10 bg-white">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">FPTU Booking</h2>
            <p className="text-gray-500">Đăng nhập để tiếp tục.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* 1. Chọn Campus */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cơ sở hoạt động</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <select 
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none appearance-none cursor-pointer"
                >
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 italic">
                *Cán bộ quản lý (Staff) sẽ tự động chuyển về cơ sở được phân công.
              </p>
            </div>

            {/* 2. Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email FPT</label>
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

            {/* 3. Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu</label>
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 text-gray-400">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}

            <Button type="submit" className="w-full py-3 shadow-lg shadow-orange-200" disabled={loading}>
              {loading ? "Đang xử lý..." : "Đăng nhập ngay"}
            </Button>
          </form>
        </div>
      </div>
      <div className="hidden lg:block relative flex-1">
        <img className="absolute inset-0 h-full w-full object-cover" src={BACKGROUND_IMAGE} alt="FPT Campus" />
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/40 to-black/20 mix-blend-multiply"></div>
      </div>
    </div>
  );
}