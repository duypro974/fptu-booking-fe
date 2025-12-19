import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Calendar,
  Clock,
  User,
  Building2,
  FileText,
  Users,
  Check,
  AlertCircle,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { getBookingDetail } from "../../services/bookingService";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function BookingDetailModal({ isOpen, onClose, bookingId, onSuccess, defaultTab = null, initialBookingData = null }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("approval"); // "approval" | "tracking"

  // SINGLE booking states
  const [processingAction, setProcessingAction] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // RECURRING approval states
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [rejectionReasons, setRejectionReasons] = useState({}); // { childId: reason }
  const [processingApproval, setProcessingApproval] = useState(false);

  // RECURRING tracking states
  const [cancellingSlotId, setCancellingSlotId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (isOpen && bookingId) {
      // Set default tab immediately based on defaultTab prop (before loading data)
      if (defaultTab === "tracking") {
        setActiveTab("tracking");
      } else if (defaultTab === "approval") {
        setActiveTab("approval");
      } else {
        setActiveTab("approval"); // Default to approval
      }
      
      // If we have initialBookingData, set it immediately for faster UI rendering
      if (initialBookingData) {
        console.log("[BookingDetailModal] Setting initial booking data:", initialBookingData);
        setBooking(initialBookingData);
      }
      loadBookingDetail();
    } else {
      // Reset states when modal closes
      setBooking(null);
      setError("");
      setActiveTab("approval");
      setSelectedSlots(new Set());
      setRejectionReasons({});
      setRejectReason("");
      setCancelReason("");
      setCancellingSlotId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingId, initialBookingData, defaultTab]);

  useEffect(() => {
    if (booking) {
      // If defaultTab prop is provided, use it (for both "approval" and "tracking")
      if (defaultTab === "tracking") {
        setActiveTab("tracking");
      } else if (defaultTab === "approval") {
        setActiveTab("approval");
      } else {
        // Otherwise, set default tab based on parent status
        const parentStatus = String(booking.status || "").toUpperCase();
        if (parentStatus === "PENDING") {
          setActiveTab("approval");
        } else {
          setActiveTab("tracking");
        }
      }

      // Initialize selected slots (all checked by default for PENDING slots)
      // Check if this is a RECURRING booking with bookings array
      const hasBookingsArray = Array.isArray(booking.bookings) && booking.bookings.length > 0;
      if (hasBookingsArray) {
        const pendingSlots = booking.bookings.filter(
          (child) => String(child.status || "").toUpperCase() === "PENDING"
        );
        const defaultSelected = new Set(pendingSlots.map((child) => child.id));
        setSelectedSlots(defaultSelected);
      }
    }
  }, [booking, defaultTab]);

  const loadBookingDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBookingDetail(bookingId);
      console.log("[BookingDetailModal] Loaded booking data:", data);
      console.log("[BookingDetailModal] Full booking object:", JSON.stringify(data, null, 2));
      console.log("[BookingDetailModal] bookingType:", data?.bookingType);
      console.log("[BookingDetailModal] isGroup:", data?.isGroup);
      console.log("[BookingDetailModal] isRecurring:", data?.isRecurring);
      console.log("[BookingDetailModal] status:", data?.status);
      console.log("[BookingDetailModal] bookings array:", data?.bookings);
      console.log("[BookingDetailModal] bookings length:", data?.bookings?.length || 0);
      
      // If API doesn't return bookings array but we have initialBookingData with bookings, merge them
      // Also merge recurring flags from initialBookingData to ensure correct detection
      if (initialBookingData) {
        // Check if initialBookingData has _aggregated.childSlots (from RECURRING_ACTIVE tab)
        if (!Array.isArray(data.bookings) && initialBookingData._aggregated && Array.isArray(initialBookingData._aggregated.childSlots)) {
          console.log("[BookingDetailModal] Merging childSlots from _aggregated into bookings array");
          data.bookings = initialBookingData._aggregated.childSlots;
        } else if (!Array.isArray(data.bookings) && Array.isArray(initialBookingData.bookings)) {
          console.log("[BookingDetailModal] Merging bookings array from initialBookingData");
          data.bookings = initialBookingData.bookings;
        }
        // Always merge recurring flags from initialBookingData if they exist (they're more reliable from ApprovalList)
        if (initialBookingData.isGroup !== undefined) data.isGroup = initialBookingData.isGroup;
        if (initialBookingData.isRecurring !== undefined) data.isRecurring = initialBookingData.isRecurring;
        if (initialBookingData.bookingType !== undefined) data.bookingType = initialBookingData.bookingType;
        if (initialBookingData.user && !data.user) data.user = initialBookingData.user;
        if (initialBookingData.userName && !data.userName) data.userName = initialBookingData.userName;
        if (initialBookingData.userEmail && !data.userEmail) data.userEmail = initialBookingData.userEmail;
        // If initialBookingData indicates it's recurring (via any flag), ensure we preserve that
        const initialIsRecurring = initialBookingData.isGroup === true || 
                                   initialBookingData.isRecurring === true ||
                                   Array.isArray(initialBookingData.bookings) && initialBookingData.bookings.length > 0 ||
                                   (initialBookingData._aggregated && Array.isArray(initialBookingData._aggregated.childSlots) && initialBookingData._aggregated.childSlots.length > 0) ||
                                   initialBookingData.bookingType === "RECURRING" ||
                                   initialBookingData.status === "PENDING_GROUP";
        if (initialIsRecurring) {
          // Ensure flags are set even if API didn't return them
          if (data.isGroup === undefined) data.isGroup = true;
          if (data.isRecurring === undefined) data.isRecurring = true;
        }
        console.log("[BookingDetailModal] After merge - isGroup:", data.isGroup, "isRecurring:", data.isRecurring, "bookings length:", data.bookings?.length);
      }
      
      setBooking(data);
    } catch (e) {
      console.error("[BookingDetailModal] Error loading booking:", e);
      // If API fails but we have initialBookingData, use it as fallback
      if (initialBookingData) {
        console.log("[BookingDetailModal] Using initialBookingData as fallback");
        // If initialBookingData has _aggregated.childSlots, merge them into bookings
        const fallbackData = { ...initialBookingData };
        if (fallbackData._aggregated && Array.isArray(fallbackData._aggregated.childSlots) && !Array.isArray(fallbackData.bookings)) {
          fallbackData.bookings = fallbackData._aggregated.childSlots;
        }
        setBooking(fallbackData);
      } else {
        setError(e.message || "Lỗi khi tải thông tin booking");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeVN = (dateTimeString) => {
    if (!dateTimeString) return "N/A";
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return "N/A";

      // Format to DD/MM/YYYY, HH:mm (using local time which should be UTC+7)
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch {
      return "N/A";
    }
  };

  const formatTimeRange = (startTime, endTime) => {
    const start = formatDateTimeVN(startTime);
    const end = formatDateTimeVN(endTime);
    if (start === "N/A" || end === "N/A") return "N/A";
    // Extract time part (after comma)
    const startTimePart = start.split(", ")[1];
    const endTimePart = end.split(", ")[1];
    const datePart = start.split(", ")[0];
    return `${datePart}, ${startTimePart} - ${endTimePart}`;
  };

  const getRoomName = (facility) => {
    if (typeof facility === "string") return facility;
    return facility?.name || facility?.facilityName || "N/A";
  };

  const getUserName = (user, userId) => {
    if (typeof user === "string") return user;
    if (user?.fullName) return user.fullName;
    if (user?.name) return user.name;
    if (user?.email) return user.email;
    if (userId) return `User ID: ${userId}`;
    return "N/A";
  };

  // SINGLE booking actions
  const handleApproveSingle = async () => {
    if (processingAction) return;
    setProcessingAction(true);
    setError("");

    try {
      const campus = user?.campus || null;
      await api.approveBooking(bookingId, campus, user?.name || "Admin");
      await loadBookingDetail(); // Refetch to update status
      onSuccess?.();
    } catch (e) {
      console.error("[BookingDetailModal] Error approving:", e);
      setError(e.message || "Lỗi khi duyệt đơn");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectSingle = async () => {
    if (processingAction || !rejectReason.trim()) {
      if (!rejectReason.trim()) {
        setError("Vui lòng nhập lý do từ chối");
      }
      return;
    }

    setProcessingAction(true);
    setError("");

    try {
      await api.rejectBooking(bookingId, rejectReason, user?.name || "Admin");
      await loadBookingDetail(); // Refetch to update status
      setRejectReason("");
      onSuccess?.();
    } catch (e) {
      console.error("[BookingDetailModal] Error rejecting:", e);
      setError(e.message || "Lỗi khi từ chối đơn");
    } finally {
      setProcessingAction(false);
    }
  };

  // RECURRING approval actions
  const toggleSlotSelection = (childId) => {
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(childId)) {
      newSelected.delete(childId);
    } else {
      newSelected.add(childId);
      // Remove rejection reason if re-checked
      const newReasons = { ...rejectionReasons };
      delete newReasons[childId];
      setRejectionReasons(newReasons);
    }
    setSelectedSlots(newSelected);
  };

  const handleRejectionReasonChange = (childId, reason) => {
    setRejectionReasons((prev) => ({
      ...prev,
      [childId]: reason,
    }));
  };

  const handleProcessApproval = async () => {
    console.log("[BookingDetailModal] handleProcessApproval called", { processingApproval, booking });
    if (processingApproval || !booking) {
      console.log("[BookingDetailModal] handleProcessApproval: Early return", { processingApproval, hasBooking: !!booking });
      return;
    }
    
    // Check if this is a RECURRING booking (same logic as detection)
    const hasBookingsArray = Array.isArray(booking.bookings) && booking.bookings.length > 0;
    const isRecurringType = booking.bookingType === "RECURRING" || 
                           booking.bookingType?.name === "RECURRING" ||
                           String(booking.bookingType || "").toUpperCase() === "RECURRING";
    const isGroup = booking.isGroup === true;
    const isRecurringFlag = booking.isRecurring === true;
    const isRecurringBooking = hasBookingsArray || isRecurringType || isGroup || isRecurringFlag;
    
    console.log("[BookingDetailModal] handleProcessApproval: Detection", {
      hasBookingsArray,
      isRecurringType,
      isGroup,
      isRecurringFlag,
      isRecurringBooking
    });
    
    if (!isRecurringBooking) {
      console.error("[BookingDetailModal] handleProcessApproval: Not a recurring booking");
      setError("Đây không phải là booking định kỳ");
      return;
    }

    // Validate: unchecked slots must have rejection reason (check before processing)
    const pendingSlotsForValidation = booking.bookings.filter(
      (child) => String(child.status || "").toUpperCase() === "PENDING"
    );

    const uncheckedSlotsForValidation = pendingSlotsForValidation.filter(
      (child) => !selectedSlots.has(child.id)
    );

    const missingReasons = uncheckedSlotsForValidation.filter((child) => !rejectionReasons[child.id]?.trim());
    if (missingReasons.length > 0) {
      setError("Vui lòng nhập lý do từ chối cho các slot đã bỏ chọn");
      return;
    }

    if (pendingSlotsForValidation.length === 0) {
      setError("Không còn slot nào đang chờ duyệt");
      return;
    }

    setProcessingApproval(true);
    setError("");

    try {
      // Double-check: Only process slots that are actually PENDING at this moment
      const pendingSlots = booking.bookings.filter(
        (child) => String(child.status || "").toUpperCase() === "PENDING"
      );

      if (pendingSlots.length === 0) {
        setError("Không còn slot nào đang chờ duyệt");
        setProcessingApproval(false);
        return;
      }

      const campus = user?.campus || null;
      
      // Only approve slots that are both PENDING and selected
      const toApprove = pendingSlots.filter((child) => selectedSlots.has(child.id));
      const approvePromises = toApprove.map((child) => 
        api.approveBooking(child.id, campus, user?.name || "Admin")
      );

      // Only reject slots that are both PENDING and unchecked (with reason)
      const toReject = pendingSlots.filter((child) => 
        !selectedSlots.has(child.id) && rejectionReasons[child.id]?.trim()
      );
      const rejectPromises = toReject.map((child) =>
        api.rejectBooking(child.id, rejectionReasons[child.id], user?.name || "Admin")
      );

      if (approvePromises.length === 0 && rejectPromises.length === 0) {
        setError("Không có slot nào được chọn để xử lý");
        setProcessingApproval(false);
        return;
      }

      await Promise.all([...approvePromises, ...rejectPromises]);

      // Refetch data
      await loadBookingDetail();
      // Reset selections
      const newPendingSlots = booking.bookings.filter(
        (child) => String(child.status || "").toUpperCase() === "PENDING"
      );
      setSelectedSlots(new Set(newPendingSlots.map((child) => child.id)));
      setRejectionReasons({});
      onSuccess?.();
    } catch (e) {
      console.error("[BookingDetailModal] Error processing approval:", e);
      setError(e.message || "Lỗi khi xử lý duyệt đơn");
    } finally {
      setProcessingApproval(false);
    }
  };

  // RECURRING tracking actions
  const handleCancelSlot = async (childId) => {
    if (!cancelReason.trim()) {
      setError("Vui lòng nhập lý do hủy");
      return;
    }

    setCancellingSlotId(childId);
    setError("");

    try {
      // Use cancelByAdmin API for admin to cancel approved bookings
      // This API requires FACILITY_ADMIN permission
      await api.cancelByAdmin(childId, cancelReason);
      setCancelReason("");
      setCancellingSlotId(null);
      await loadBookingDetail(); // Refetch data
      onSuccess?.();
    } catch (e) {
      console.error("[BookingDetailModal] Error cancelling slot:", e);
      setError(e.message || "Lỗi khi hủy slot");
      setCancellingSlotId(null);
    }
  };

  const isPast = (endTime) => {
    if (!endTime) return false;
    try {
      const end = new Date(endTime);
      return end < new Date();
    } catch {
      return false;
    }
  };

  const getStatusBadge = (status) => {
    const statusUpper = String(status || "").toUpperCase();
    if (statusUpper === "APPROVED") return { type: "success", label: "Đã duyệt" };
    if (statusUpper === "PENDING") return { type: "warning", label: "Chờ duyệt" };
    if (statusUpper === "REJECTED") return { type: "danger", label: "Từ chối" };
    if (statusUpper === "CANCELLED" || statusUpper === "CANCELED")
      return { type: "secondary", label: "Đã hủy" };
    if (statusUpper === "USED") return { type: "success", label: "Đã sử dụng" };
    return { type: "secondary", label: statusUpper || "N/A" };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b px-6 pt-6">
            <h2 className="text-xl font-bold text-gray-900">Chi tiết đơn đặt phòng</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={loading || processingAction || processingApproval}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
                <p className="text-gray-500">Đang tải thông tin...</p>
              </div>
            ) : error && !booking ? (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
                <p className="text-red-600">{error}</p>
                <Button variant="secondary" onClick={onClose} className="mt-4">
                  Đóng
                </Button>
              </div>
            ) : booking ? (
              <>
                {(() => {
                  // Determine if this is a RECURRING booking
                  // Use same logic as ApprovalList: check bookingGroupId or bookings array
                  // A booking is RECURRING if:
                  // 1. It has bookingGroupId (it's a child slot of a recurring booking)
                  // 2. It has bookings array with length > 0 (it's a parent group with children)
                  // 3. Additional checks: isGroup, isRecurring, bookingType, PENDING_GROUP status
                  const hasBookingGroupId = booking.bookingGroupId !== null && booking.bookingGroupId !== undefined;
                  const hasBookingsArray = Array.isArray(booking.bookings) && booking.bookings.length > 0;
                  const isRecurringType = booking.bookingType === "RECURRING" || 
                                         booking.bookingType?.name === "RECURRING" ||
                                         String(booking.bookingType || "").toUpperCase() === "RECURRING";
                  const isGroup = booking.isGroup === true;
                  const isRecurringFlag = booking.isRecurring === true;
                  const isPendingGroup = booking.status === "PENDING_GROUP" || String(booking.status || "").toUpperCase() === "PENDING_GROUP";
                  
                  // Primary detection (same as ApprovalList)
                  // If it has bookings array with children, it's definitely RECURRING
                  // Or if it has bookingGroupId, it's a child of a recurring booking (should use parent ID)
                  // Also check other flags as fallback
                  const isRecurringBooking = hasBookingGroupId || hasBookingsArray || isRecurringType || isGroup || isRecurringFlag || isPendingGroup;
                  
                  console.log("[BookingDetailModal] Detecting booking type:", {
                    hasBookingGroupId,
                    hasBookingsArray,
                    isRecurringType,
                    isGroup,
                    isRecurringFlag,
                    isPendingGroup,
                    isRecurringBooking,
                    bookingsCount: booking.bookings?.length || 0,
                    status: booking.status,
                    bookingType: booking.bookingType,
                    bookingGroupId: booking.bookingGroupId
                  });
                  
                  return isRecurringBooking;
                })() ? (
                  // RECURRING BOOKING UI
                  <>
                    {/* Parent Info */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Người đặt</div>
                          <div className="font-medium">{getUserName(booking.user, booking.userId)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Trạng thái</div>
                          <Badge {...getStatusBadge(booking.status)} />
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    {/* Logic:
                        - RECURRING_PENDING (defaultTab="approval"): Chỉ hiển thị tab "Duyệt đơn"
                        - RECURRING_ACTIVE (defaultTab="tracking"): Chỉ hiển thị tab "Theo dõi"
                        - Other cases: Hiển thị cả 2 tabs dựa vào status
                    */}
                    {(() => {
                      const parentStatus = String(booking.status || "").toUpperCase();
                      const isPendingStatus = parentStatus === "PENDING" || parentStatus === "PENDING_GROUP";
                      
                      // Nếu mở từ RECURRING_ACTIVE tab, chỉ hiển thị "Theo dõi"
                      if (defaultTab === "tracking") {
                        return null; // Không hiển thị tabs, chỉ hiển thị content trực tiếp
                      }
                      
                      // Nếu mở từ RECURRING_PENDING tab, chỉ hiển thị "Duyệt đơn"
                      if (defaultTab === "approval") {
                        return null; // Không hiển thị tabs, chỉ hiển thị content trực tiếp
                      }
                      
                      // Other cases: Hiển thị cả 2 tabs dựa vào status
                      const showTrackingTab = !isPendingStatus;
                      
                      return (
                        <div className="border-b border-gray-200 mb-4">
                          <div className="flex gap-4">
                            <button
                              onClick={() => setActiveTab("approval")}
                              className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
                                activeTab === "approval"
                                  ? "border-orange-500 text-orange-600"
                                  : "border-transparent text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              Duyệt đơn
                            </button>
                            {showTrackingTab && (
                              <button
                                onClick={() => setActiveTab("tracking")}
                                className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
                                  activeTab === "tracking"
                                    ? "border-orange-500 text-orange-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                Theo dõi
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tab Content: Approval - Show if defaultTab is "approval" OR activeTab is "approval" (when no defaultTab) */}
                    {((defaultTab === "approval") || (defaultTab !== "tracking" && activeTab === "approval")) && (
                      <div>
                        {(() => {
                          if (!Array.isArray(booking.bookings) || booking.bookings.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <p className="mb-2">Không tìm thấy dữ liệu slots để duyệt.</p>
                                <p className="text-xs text-gray-400">API không trả về thông tin bookings array.</p>
                              </div>
                            );
                          }
                          
                          const pendingSlots = booking.bookings.filter(
                            (child) => String(child.status || "").toUpperCase() === "PENDING"
                          );

                          if (pendingSlots.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                Không có slot nào đang chờ duyệt
                              </div>
                            );
                          }

                          return (
                            <>
                              <div className="mb-4">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left">Chọn</th>
                                      <th className="px-4 py-2 text-left">Thời gian</th>
                                      <th className="px-4 py-2 text-left">Phòng</th>
                                      <th className="px-4 py-2 text-left">Lý do từ chối</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {pendingSlots.map((child) => {
                                      const isSelected = selectedSlots.has(child.id);
                                      const showReasonInput = !isSelected;

                                      return (
                                        <tr key={child.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleSlotSelection(child.id)}
                                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                            />
                                          </td>
                                          <td className="px-4 py-3">
                                            {formatTimeRange(child.startTime, child.endTime)}
                                          </td>
                                          <td className="px-4 py-3">
                                            {getRoomName(child.facility)}
                                          </td>
                                          <td className="px-4 py-3">
                                            {showReasonInput && (
                                              <input
                                                type="text"
                                                value={rejectionReasons[child.id] || ""}
                                                onChange={(e) =>
                                                  handleRejectionReasonChange(child.id, e.target.value)
                                                }
                                                placeholder="Nhập lý do từ chối..."
                                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                              />
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Tab Content: Tracking - Show if defaultTab is "tracking" OR activeTab is "tracking" (when no defaultTab) */}
                    {((defaultTab === "tracking") || (defaultTab !== "approval" && activeTab === "tracking")) && (
                      <div>
                        {(() => {
                          if (!Array.isArray(booking.bookings) || booking.bookings.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <p className="mb-2">Không tìm thấy dữ liệu slots để theo dõi.</p>
                                <p className="text-xs text-gray-400">API không trả về thông tin bookings array.</p>
                              </div>
                            );
                          }
                          
                          const trackedSlots = booking.bookings
                            .filter((child) => {
                              const status = String(child.status || "").toUpperCase();
                              return status === "APPROVED" || status === "USED";
                            })
                            .sort((a, b) => {
                              const dateA = a.startTime ? new Date(a.startTime).getTime() : 0;
                              const dateB = b.startTime ? new Date(b.startTime).getTime() : 0;
                              return dateA - dateB;
                            });

                          if (trackedSlots.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                Không có slot nào để theo dõi
                              </div>
                            );
                          }

                          // Calculate statistics: used slots (past) vs total
                          const now = new Date().getTime();
                          const usedSlots = trackedSlots.filter((slot) => {
                            if (!slot.endTime) return false;
                            return new Date(slot.endTime).getTime() < now;
                          }).length;
                          const totalSlots = trackedSlots.length;
                          const remainingSlots = totalSlots - usedSlots;

                          return (
                            <div className="space-y-4">
                              {/* Summary Statistics */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-blue-900 mb-1">
                                      Tiến độ sử dụng
                                    </div>
                                    <div className="text-2xl font-bold text-blue-700">
                                      {usedSlots}/{totalSlots} buổi
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm text-blue-600">
                                      <div>Đã sử dụng: <span className="font-semibold">{usedSlots}</span> buổi</div>
                                      <div className="mt-1">Chưa sử dụng: <span className="font-semibold">{remainingSlots}</span> buổi</div>
                                    </div>
                                  </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${totalSlots > 0 ? (usedSlots / totalSlots * 100) : 0}%` }}
                                  />
                                </div>
                              </div>

                              {/* Slots List */}
                              <div className="space-y-3">
                              {trackedSlots.map((child) => {
                                const slotIsPast = isPast(child.endTime);
                                const badge = getStatusBadge(child.status);

                                return (
                                  <div
                                    key={child.id}
                                    className={`p-4 border rounded-lg ${
                                      slotIsPast
                                        ? "opacity-50 bg-gray-100"
                                        : "bg-white border-gray-200"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`font-medium ${slotIsPast ? "text-gray-500" : "text-gray-900"}`}>
                                            {formatTimeRange(child.startTime, child.endTime)}
                                          </span>
                                          <Badge {...badge} />
                                        </div>
                                        <div className={`text-sm ${slotIsPast ? "text-gray-400" : "text-gray-600"}`}>
                                          Phòng: {getRoomName(child.facility)}
                                        </div>
                                      </div>
                                      {!slotIsPast && (
                                        <div className="ml-4">
                                          {cancellingSlotId === child.id ? (
                                            <div className="flex flex-col gap-2 min-w-[300px]">
                                              <input
                                                type="text"
                                                value={cancelReason}
                                                onChange={(e) => setCancelReason(e.target.value)}
                                                placeholder="Nhập lý do hủy..."
                                                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                              />
                                              <div className="flex gap-2">
                                                <Button
                                                  variant="primary"
                                                  size="sm"
                                                  onClick={() => handleCancelSlot(child.id)}
                                                  disabled={!cancelReason.trim()}
                                                >
                                                  Xác nhận
                                                </Button>
                                                <Button
                                                  variant="secondary"
                                                  size="sm"
                                                  onClick={() => {
                                                    setCancellingSlotId(null);
                                                    setCancelReason("");
                                                  }}
                                                >
                                                  Hủy
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <Button
                                              variant="danger"
                                              size="sm"
                                              onClick={() => setCancellingSlotId(child.id)}
                                            >
                                              Hủy
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                ) : (
                  // SINGLE BOOKING UI
                  <div className="space-y-6">
                    {/* Booking Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <User className="w-4 h-4" />
                          <span>Người đặt</span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {getUserName(booking.user, booking.userId)}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <Building2 className="w-4 h-4" />
                          <span>Phòng</span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {getRoomName(booking.facility)}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>Thời gian</span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {formatTimeRange(booking.startTime, booking.endTime)}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <Users className="w-4 h-4" />
                          <span>Số người</span>
                        </div>
                        <p className="font-medium text-gray-900">
                          {booking.attendeeCount || booking.participants || "N/A"}
                        </p>
                      </div>

                      {booking.purpose && (
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <FileText className="w-4 h-4" />
                            <span>Mục đích</span>
                          </div>
                          <p className="text-gray-900">{booking.purpose}</p>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span>Trạng thái</span>
                        </div>
                        <Badge {...getStatusBadge(booking.status)} />
                      </div>
                    </div>

                    {/* Reject Reason Input (if needed) */}
                    {String(booking.status || "").toUpperCase() === "PENDING" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lý do từ chối (nếu từ chối)
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows="3"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Nhập lý do từ chối..."
                        />
                      </div>
                    )}

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t pt-4 pb-6 px-6 mt-4">
            {booking && (
              <>
                {(() => {
                  // Same logic as above
                  const hasBookingsArray = Array.isArray(booking.bookings) && booking.bookings.length > 0;
                  const isRecurringType = booking.bookingType === "RECURRING" || 
                                         booking.bookingType?.name === "RECURRING" ||
                                         String(booking.bookingType || "").toUpperCase() === "RECURRING";
                  const isGroup = booking.isGroup === true;
                  const isRecurringFlag = booking.isRecurring === true;
                  return hasBookingsArray || isRecurringType || isGroup || isRecurringFlag;
                })() ? (
                  // RECURRING Footer
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>
                      Đóng
                    </Button>
                    {activeTab === "approval" && (
                      <Button
                        variant="primary"
                        onClick={handleProcessApproval}
                        disabled={processingApproval}
                      >
                        {processingApproval ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Đang xử lý...
                          </>
                        ) : (
                          "Xác nhận xử lý"
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  // SINGLE Footer
                  booking.status?.toUpperCase() === "PENDING" && (
                    <div className="flex justify-end gap-3">
                      <Button variant="secondary" onClick={onClose}>
                        Đóng
                      </Button>
                      <Button
                        variant="danger"
                        onClick={handleRejectSingle}
                        disabled={processingAction}
                      >
                        {processingAction ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Đang xử lý...
                          </>
                        ) : (
                          "Từ chối"
                        )}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleApproveSingle}
                        disabled={processingAction}
                      >
                        {processingAction ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Đang xử lý...
                          </>
                        ) : (
                          "Duyệt đơn"
                        )}
                      </Button>
                    </div>
                  )
                )}
              </>
            )}

            {error && booking && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
