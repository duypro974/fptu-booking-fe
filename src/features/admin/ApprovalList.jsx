import { useEffect, useState } from "react";
import { Check, X, Clock, Calendar, User, Building2, AlertCircle, Info, Users } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";

export default function ApprovalList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [conflictCount, setConflictCount] = useState(0);
  const [conflictList, setConflictList] = useState([]);

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user?.campus) return;
    setLoading(true);
    try {
      const data = await api.getPendingApprovals(user.campus);
      // Sắp xếp theo thời gian tạo: Đơn đặt trước (createdAt cũ hơn) lên đầu
      const sortedData = data.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB; // Tăng dần: đơn cũ nhất lên đầu
      });
      setRequests(sortedData);
    } catch (error) {
      console.error("Lỗi tải danh sách yêu cầu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleApprove = async (request) => {
    setSelectedRequest(request);
    // Kiểm tra conflict trước khi approve
    try {
      const conflicts = await api.checkBookingConflicts(request.id, user.campus);
      setConflictCount(conflicts.length);
      setConflictList(conflicts);
      setShowApproveModal(true);
    } catch (error) {
      console.error("Lỗi kiểm tra conflict:", error);
      setConflictCount(0);
      setConflictList([]);
      setShowApproveModal(true);
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối!");
      return;
    }

    try {
      await api.rejectBooking(selectedRequest.id, rejectReason, user?.name || "Admin");
      await loadRequests();
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason("");
      alert("Đã từ chối đơn thành công!");
    } catch (error) {
      alert("Lỗi khi từ chối đơn!");
    }
  };

  const confirmApprove = async () => {
    try {
      await api.approveBooking(selectedRequest.id, user.campus, user?.name || "Admin");
      await loadRequests();
      setShowApproveModal(false);
      setSelectedRequest(null);
      setConflictCount(0);
      setConflictList([]);
      alert(`Đã duyệt đơn thành công!${conflictCount > 0 ? ` ${conflictCount} đơn trùng lịch đã bị tự động từ chối.` : ''}`);
    } catch (error) {
      alert("Lỗi khi duyệt đơn!");
    }
  };

  const formatTime = (startTime, endTime) => {
    if (!startTime || !endTime) return "N/A";
    return `${startTime} - ${endTime}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  const formatCreatedAt = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} ngày trước (${date.toLocaleDateString("vi-VN", { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })})`;
    } else if (diffHours > 0) {
      return `${diffHours} giờ trước`;
    } else {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins > 0 ? `${diffMins} phút trước` : "Vừa xong";
    }
  };

  const getPriorityBadge = (index, createdAt) => {
    // Đơn đầu tiên (index 0) là đơn đặt trước nhất
    if (index === 0) {
      return <Badge type="success" className="text-xs">Đặt trước nhất</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duyệt yêu cầu đặt phòng</h1>
          <p className="text-gray-500">Xem và xử lý các yêu cầu đặt phòng đang chờ duyệt tại {user?.campusName}.</p>
        </div>
        <Badge type="warning" className="text-base px-4 py-2">
          {requests.length} đơn chờ duyệt
        </Badge>
      </div>

      {/* Danh sách yêu cầu */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Đang tải dữ liệu...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">Hiện không có yêu cầu nào cần xử lý.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req, index) => (
            <Card key={req.id} className={`p-6 hover:shadow-md transition-shadow ${index === 0 ? 'border-2 border-green-200 bg-green-50/30' : ''}`}>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Thông tin chính */}
                <div className="flex-1 space-y-4">
                  {/* Header với Room và Date */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Building2 className="w-5 h-5 text-orange-600" />
                        <h3 className="text-xl font-bold text-gray-900">{req.roomName}</h3>
                        {getPriorityBadge(index, req.createdAt)}
                        {req.isEvent && (
                          <Badge type="info" className="text-xs">Sự kiện CLB</Badge>
                        )}
                        {req.isRecurring && (
                          <Badge type="info" className="text-xs">Định kỳ</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(req.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(req.startTime, req.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span>Đặt: {formatCreatedAt(req.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin người đặt */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <User className="w-4 h-4" />
                        <span>Người đặt</span>
                      </div>
                      <p className="font-medium text-gray-900">{req.userName}</p>
                      <p className="text-xs text-gray-500">{req.userEmail}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Users className="w-4 h-4" />
                        <span>Số người tham gia</span>
                      </div>
                      <p className="font-medium text-gray-900">{req.participantCount || "N/A"} người</p>
                    </div>
                  </div>

                  {/* Lý do đặt phòng */}
                  {req.reason && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-1">
                        <Info className="w-4 h-4" />
                        <span>Lý do đặt phòng</span>
                      </div>
                      <p className="text-sm text-blue-800">{req.reason}</p>
                    </div>
                  )}

                  {/* Lý do Priority (nếu có) */}
                  {req.priorityReason && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-orange-900 mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>Lý do ưu tiên</span>
                      </div>
                      <p className="text-sm text-orange-800">{req.priorityReason}</p>
                    </div>
                  )}

                  {/* Thông tin bổ sung */}
                  {req.supportRequest && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Yêu cầu hỗ trợ:</span> {req.supportRequest}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 lg:w-48">
                  <Button
                    variant="primary"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(req)}
                  >
                    <Check className="w-4 h-4" />
                    Duyệt đơn
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    onClick={() => handleReject(req)}
                  >
                    <X className="w-4 h-4" />
                    Từ chối
                  </Button>
                  <div className="text-xs text-gray-500 text-center pt-2">
                    Đơn #{req.bookingCode || req.id}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Từ chối */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Từ chối yêu cầu</h2>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectReason("");
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Bạn đang từ chối yêu cầu đặt phòng <strong>{selectedRequest.roomName}</strong> của <strong>{selectedRequest.userName}</strong>.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do từ chối *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Nhập lý do từ chối yêu cầu này..."
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectReason("");
                }}
              >
                Hủy
              </Button>
              <Button variant="danger" onClick={confirmReject}>
                Xác nhận từ chối
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Duyệt */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Duyệt yêu cầu</h2>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                  setConflictCount(0);
                  setConflictList([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Bạn đang duyệt yêu cầu đặt phòng <strong>{selectedRequest.roomName}</strong> của <strong>{selectedRequest.userName}</strong>.
              </p>

              {conflictCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-900 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Cảnh báo xung đột lịch</span>
                  </div>
                  <p className="text-sm text-yellow-800 mb-3">
                    Có <strong>{conflictCount}</strong> yêu cầu khác đang chờ duyệt trùng lịch với yêu cầu này. 
                    Khi bạn duyệt đơn này, các yêu cầu trùng lịch sẽ tự động bị từ chối.
                  </p>
                  
                  {/* Danh sách các booking bị conflict */}
                  <div className="space-y-2">
                    {conflictList.map((conflict, idx) => {
                      const isOlder = conflict.createdAt && selectedRequest.createdAt 
                        ? new Date(conflict.createdAt).getTime() < new Date(selectedRequest.createdAt).getTime()
                        : false;
                      
                      return (
                        <div 
                          key={conflict.id} 
                          className={`bg-white border rounded p-2 text-sm ${
                            isOlder 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-yellow-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="font-medium text-gray-900">#{conflict.bookingCode}</span>
                                <span className="text-gray-600 ml-2">- {conflict.userName}</span>
                              </div>
                              {isOlder && (
                                <Badge type="danger" className="text-xs">Đặt trước</Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-gray-600 text-xs block">
                                {conflict.startTime} - {conflict.endTime}
                              </span>
                              {conflict.createdAt && (
                                <span className="text-gray-500 text-xs">
                                  {formatCreatedAt(conflict.createdAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isOlder && (
                            <p className="text-xs text-red-700 mt-1 italic">
                              ⚠️ Đơn này đặt trước đơn bạn đang duyệt, sẽ bị từ chối
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500">
                Bạn có chắc chắn muốn duyệt yêu cầu này không?
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                  setConflictCount(0);
                  setConflictList([]);
                }}
              >
                Hủy
              </Button>
              <Button variant="primary" onClick={confirmApprove}>
                Xác nhận duyệt
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
