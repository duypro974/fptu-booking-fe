import { User, Mail, MapPin, Shield, Edit } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
      
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="relative">
          <img 
            src={user?.avatar} 
            alt="Avatar" 
            className="w-32 h-32 rounded-full border-4 border-orange-50 object-cover"
          />
          <button className="absolute bottom-0 right-0 bg-white p-2 rounded-full border shadow-sm hover:text-orange-600">
            <Edit className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center md:text-left flex-1">
          <h2 className="text-3xl font-bold text-gray-900">{user?.name}</h2>
          <p className="text-gray-500 mt-1">{user?.email}</p>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-4">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full flex items-center gap-2">
              <Shield className="w-3 h-3" /> {user?.role === 'student' ? 'Sinh viên' : 'Quản trị viên'}
            </span>
            <span className="px-3 py-1 bg-orange-50 text-orange-700 text-sm font-medium rounded-full flex items-center gap-2">
              <MapPin className="w-3 h-3" /> {user?.campusName}
            </span>
          </div>
        </div>
      </div>

      {/* Detail Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Thông tin tài khoản</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase">Mã số</label>
              <p className="font-medium">SE160123</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase">Ngày tham gia</label>
              <p className="font-medium">12/09/2021</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase">Trạng thái</label>
              <p className="text-green-600 font-bold">Đang hoạt động</p>
            </div>
          </div>
        </Card>

        <Card>
           <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Bảo mật</h3>
           <div className="space-y-4">
             <div className="flex justify-between items-center">
               <div>
                 <p className="font-medium">Đổi mật khẩu</p>
                 <p className="text-xs text-gray-400">Lần đổi cuối: 3 tháng trước</p>
               </div>
               <Button variant="outline" size="sm">Cập nhật</Button>
             </div>
             <div className="flex justify-between items-center">
               <div>
                 <p className="font-medium">Xác thực 2 bước (2FA)</p>
                 <p className="text-xs text-gray-400">Chưa kích hoạt</p>
               </div>
               <Button variant="outline" size="sm">Bật</Button>
             </div>
           </div>
        </Card>
      </div>
    </div>
  );
}