import { useEffect, useState } from "react";
import { Check, X, Clock } from "lucide-react";
import { api } from "../../services/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

export default function ApprovalList() {
  const [requests, setRequests] = useState([]);

  // Load danh sách chờ duyệt
  useEffect(() => {
    api.getPendingApprovals().then(setRequests);
  }, []);

  // Xử lý nút Duyệt/Từ chối
  const handleAction = async (id, isApprove) => {
    try {
      await api.approveBooking(id, isApprove);
      // Xóa item khỏi danh sách sau khi xử lý xong
      setRequests(prev => prev.filter(req => req.id !== id));
      alert(isApprove ? "Đã duyệt đơn!" : "Đã từ chối đơn!");
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      alert("Có lỗi xảy ra");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Yêu cầu chờ duyệt</h1>
        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
          {requests.length} đơn chờ
        </span>
      </div>

      <div className="grid gap-4">
        {requests.map((req) => (
          <Card key={req.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg text-gray-900">{req.room}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">{req.date} (Slot {req.slot})</span>
              </div>
              <p className="text-gray-600 text-sm">
                Người đặt: <span className="font-medium text-black">{req.user}</span> • 
                Lý do: <span className="italic">"{req.reason}"</span>
              </p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Button 
                variant="danger" 
                size="sm" 
                className="flex-1 md:flex-none bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                onClick={() => handleAction(req.id, false)}
              >
                <X className="w-4 h-4" /> Từ chối
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                className="flex-1 md:flex-none bg-green-600 hover:bg-green-700"
                onClick={() => handleAction(req.id, true)}
              >
                <Check className="w-4 h-4" /> Duyệt đơn
              </Button>
            </div>
          </Card>
        ))}

        {requests.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>Hiện không có yêu cầu nào cần xử lý.</p>
          </div>
        )}
      </div>
    </div>
  );
}