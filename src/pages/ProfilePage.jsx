import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mail,
  MapPin,
  Shield,
  User as UserIcon,
  Phone,
  Lock,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

import { getProfile } from "../services/authService";
import { updateProfile, changePassword } from "../services/userService";

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();

  const [profile, setProfile] = useState(null);

  /* ===== PROFILE FORM ===== */
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  /* ===== PASSWORD FORM ===== */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* ===== UI STATE ===== */
  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [errorProfile, setErrorProfile] = useState("");
  const [successProfile, setSuccessProfile] = useState("");

  const [errorPassword, setErrorPassword] = useState("");
  const [successPassword, setSuccessPassword] = useState("");

  // 0 = Thông tin, 1 = Đổi mật khẩu
  const [activeTab, setActiveTab] = useState(0);
  const sliderRef = useRef(null);

  /* ===== ROLE LABEL ===== */
  const roleLabel = useMemo(() => {
    const role = (profile?.role || user?.role || "").toUpperCase();
    switch (role) {
      case "STUDENT":
        return "Sinh viên";
      case "LECTURER":
        return "Giảng viên";
      case "FACILITY_ADMIN":
        return "Facility Admin";
      case "SECURITY":
        return "Bảo vệ";
      default:
        return role || "Không rõ";
    }
  }, [profile?.role, user?.role]);

  const campusName = profile?.campusName || user?.campusName || "";
  const email = profile?.email || user?.email || "";

  const avatar =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullName || profile?.fullName || user?.name || "User"
    )}&background=random&bold=true`;

  const scrollToTab = (index) => {
    const el = sliderRef.current;
    if (!el) return;
    const width = el.clientWidth;
    el.scrollTo({ left: width * index, behavior: "smooth" });
    setActiveTab(index);
  };

  const handleSliderScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    const index = Math.round(el.scrollLeft / width);
    if (index !== activeTab) setActiveTab(index);
  };

  /* ===== LOAD PROFILE ===== */
  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setErrorProfile("");
      try {
        const data = await getProfile();
        if (!mounted) return;

        setProfile(data);
        setFullName(data?.fullName || "");
        setPhoneNumber(data?.phoneNumber || "");
      } catch (e) {
        if (!mounted) return;
        setErrorProfile(
          e?.response?.data?.message ||
            e?.message ||
            "Không thể tải thông tin người dùng."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  /* ===== UPDATE PROFILE ===== */
  const handleUpdateProfile = async () => {
    setSavingProfile(true);
    setErrorProfile("");
    setSuccessProfile("");

    try {
      await updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      await refreshProfile();
      setSuccessProfile("Cập nhật thông tin thành công.");
    } catch (e) {
      setErrorProfile(
        e?.response?.data?.message ||
          e?.message ||
          "Cập nhật thông tin thất bại."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  /* ===== CHANGE PASSWORD ===== */
  const handleChangePassword = async () => {
    setSavingPassword(true);
    setErrorPassword("");
    setSuccessPassword("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setSavingPassword(false);
      setErrorPassword("Vui lòng nhập đầy đủ các trường mật khẩu.");
      return;
    }

    if (newPassword.length < 6) {
      setSavingPassword(false);
      setErrorPassword("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSavingPassword(false);
      setErrorPassword("Xác nhận mật khẩu không khớp.");
      return;
    }

    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccessPassword(res?.message || "Đổi mật khẩu thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setErrorPassword(
        e?.response?.data?.message ||
          e?.message ||
          "Đổi mật khẩu thất bại."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>

      {/* HEADER */}
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <img
          src={avatar}
          alt="Avatar"
          className="w-28 h-28 rounded-full border-4 border-orange-50 object-cover"
        />

        <div className="text-center md:text-left flex-1">
          <h2 className="text-3xl font-bold text-gray-900">
            {loading ? "Đang tải..." : fullName || profile?.fullName || "—"}
          </h2>

          <p className="text-gray-500 mt-1 flex items-center gap-2 justify-center md:justify-start">
            <Mail className="w-4 h-4" />
            {email || "—"}
          </p>

          <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-4">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full flex items-center gap-2">
              <Shield className="w-3 h-3" />
              {roleLabel}
            </span>

            {campusName && (
              <span className="px-3 py-1 bg-orange-50 text-orange-700 text-sm font-medium rounded-full flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                {campusName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ==== TOP TABS (rõ ràng, dễ nhận biết) ==== */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-2">
        <div className="relative grid grid-cols-2">
          {/* active underline */}
          <div
            className="absolute bottom-0 left-0 h-[3px] bg-orange-600 rounded-full transition-all duration-300"
            style={{
              width: "50%",
              transform: `translateX(${activeTab * 100}%)`,
            }}
          />
          <button
            type="button"
            onClick={() => scrollToTab(0)}
            className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 0
                ? "text-orange-700 bg-orange-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Thông tin cá nhân
          </button>
          <button
            type="button"
            onClick={() => scrollToTab(1)}
            className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 1
                ? "text-orange-700 bg-orange-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Lock className="w-4 h-4" />
            Đổi mật khẩu
          </button>
        </div>

        
      </div>

      {/* ==== SLIDE AREA ==== */}
      <div
        ref={sliderRef}
        onScroll={handleSliderScroll}
        className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-6 pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        {/* TAB 1: PROFILE */}
        <div className="min-w-full snap-start">
          <Card>
            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">
              Thông tin cá nhân
            </h3>

            {errorProfile && (
              <div className="mb-4 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl">
                {errorProfile}
              </div>
            )}
            {successProfile && (
              <div className="mb-4 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl">
                {successProfile}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Họ và tên
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-orange-200"
                  disabled={savingProfile}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Số điện thoại
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-orange-200"
                  disabled={savingProfile}
                  placeholder="090xxxxxxx"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleUpdateProfile} disabled={savingProfile}>
                {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </Card>
        </div>

        {/* TAB 2: PASSWORD */}
        <div className="min-w-full snap-start">
          <Card>
            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Đổi mật khẩu
            </h3>

            {errorPassword && (
              <div className="mb-4 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl">
                {errorPassword}
              </div>
            )}
            {successPassword && (
              <div className="mb-4 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl">
                {successPassword}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 font-bold uppercase">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-orange-200"
                  disabled={savingPassword}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-bold uppercase">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-orange-200"
                  disabled={savingPassword}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-bold uppercase">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-orange-200"
                  disabled={savingPassword}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleChangePassword} disabled={savingPassword}>
                {savingPassword ? "Đang cập nhật..." : "Đổi mật khẩu"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
