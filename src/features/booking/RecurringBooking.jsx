import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { scanRecurringAvailability, createRecurringBooking } from "../../services/bookingService";
import { getFacilities, getFacilityTypes } from "../../services/resourceService";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import SuccessDialog from "../../components/ui/SuccessDialog";
import {
  Calendar,
  Users,
  FileText,
  AlertCircle,
  Loader2,
  CalendarCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  RefreshCw,
} from "lucide-react";

const DEFAULT_SLOTS = [
  { id: 1, start: "07:00", end: "09:00", label: "Slot 1" },
  { id: 2, start: "09:00", end: "11:00", label: "Slot 2" },
  { id: 3, start: "11:00", end: "13:00", label: "Slot 3" },
  { id: 4, start: "13:00", end: "15:00", label: "Slot 4" },
  { id: 5, start: "15:00", end: "17:00", label: "Slot 5" },
];

function toLocalYMD(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseTimeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function RecurringBooking() {
  const { user } = useAuth();
  const [step, setStep] = useState("setup"); // "setup" | "scan" | "confirm" | "success"

  // Setup state
  const [facilityId, setFacilityId] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [startDate, setStartDate] = useState(() => toLocalYMD(new Date()));
  const [weeks, setWeeks] = useState(10);
  const [typeId, setTypeId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [attendeeCount, setAttendeeCount] = useState("");
  const [supportNote, setSupportNote] = useState(""); // Request Support feature

  // Data
  const [facilities, setFacilities] = useState([]);
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  // Scan results
  const [scanResults, setScanResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  // Confirm state
  const [selectedWeeks, setSelectedWeeks] = useState([]); // Weeks to book (after filtering conflicts)
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Success state
  const [successData, setSuccessData] = useState(null);

  const todayYMD = toLocalYMD(new Date());
  const isToday = startDate === todayYMD;

  const slotExpired = (slot) => isToday && parseTimeToMinutes(slot.end) <= nowMinutes();
  const slotOngoing = (slot) => {
    if (!isToday) return false;
    const now = nowMinutes();
    return parseTimeToMinutes(slot.start) <= now && now < parseTimeToMinutes(slot.end);
  };

  // Load facilities and types
  useEffect(() => {
    if (!user) return;
    loadFacilityTypes();
    loadFacilities();
  }, [user, typeId]);

  const loadFacilityTypes = async () => {
    try {
      const data = await getFacilityTypes();
      setFacilityTypes(Array.isArray(data) ? data : data?.items ?? []);
    } catch (err) {
      console.error("Error loading facility types:", err);
      setFacilityTypes([]);
    }
  };

  const loadFacilities = async () => {
    setLoadingFacilities(true);
    try {
      const filters = {};
      if (typeId) filters.typeId = Number(typeId);

      const data = await getFacilities(filters);
      const facilitiesList = Array.isArray(data) ? data : data?.items ?? [];
      setFacilities(facilitiesList);

      // Auto-select if only one facility
      if (facilitiesList.length === 1 && !facilityId) {
        setFacilityId(facilitiesList[0].id);
        setSelectedFacility(facilitiesList[0]);
      }
    } catch (err) {
      console.error("Error loading facilities:", err);
      setFacilities([]);
    } finally {
      setLoadingFacilities(false);
    }
  };

  // Update selected facility when facilityId changes
  useEffect(() => {
    if (facilityId) {
      const facility = facilities.find((f) => f.id === Number(facilityId));
      setSelectedFacility(facility || null);
    } else {
      setSelectedFacility(null);
    }
  }, [facilityId, facilities]);

  const handleSlotToggle = (slotId) => {
    const slot = DEFAULT_SLOTS.find((s) => s.id === slotId);
    if (!slot || slotExpired(slot) || slotOngoing(slot)) return;
    setSelectedSlots((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const handleScan = async () => {
    if (!facilityId || selectedSlots.length === 0) {
      setScanError("Vui lòng chọn phòng và ít nhất 1 slot");
      return;
    }

    if (!startDate || startDate < todayYMD) {
      setScanError("Vui lòng chọn ngày bắt đầu hợp lệ");
      return;
    }

    if (weeks < 1 || weeks > 20) {
      setScanError("Số tuần phải từ 1 đến 20");
      return;
    }

    setScanning(true);
    setScanError("");
    setStep("scan");

    try {
      const payload = {
        originalFacilityId: Number(facilityId),
        startDate: startDate,
        weeks: weeks,
        slot: selectedSlots,
        typeId: typeId ? Number(typeId) : 0,
      };

      console.log("[RecurringBooking] Scanning availability:", payload);
      const results = await scanRecurringAvailability(payload);
      console.log("[RecurringBooking] Scan results:", results);
      const conflictResult = results?.find(r => r.status === "CONFLICT_RESOLVED" || r.status === "CONFLICT");
      if (conflictResult) {
        console.log("[RecurringBooking] CONFLICT_RESOLVED result structure:", JSON.stringify(conflictResult, null, 2));
      }

      const now = new Date();
      // Filter out slots that are in the past or currently happening
      const validResults = (Array.isArray(results) ? results : []).filter((result) => {
        const startDateObj = new Date(startDate);
        const weekDate = new Date(startDateObj);
        weekDate.setDate(startDateObj.getDate() + (result.week - 1) * 7);

        // Check if any selected slot is in the past or currently happening
        const hasInvalidSlot = selectedSlots.some((slotId) => {
          const slot = DEFAULT_SLOTS.find((s) => s.id === slotId);
          if (!slot) return false;

          const startDateTime = new Date(weekDate);
          const [startHour, startMin] = slot.start.split(":").map(Number);
          startDateTime.setHours(startHour, startMin, 0, 0);

          return startDateTime < now;
        });

        return !hasInvalidSlot;
      });

      setScanResults(validResults);
      setStep("confirm");

      // Auto-select all available weeks (only from valid results)
      const availableWeeks = validResults
        .filter((r) => r.status === "AVAILABLE")
        .map((r) => r.week);
      setSelectedWeeks(availableWeeks);
    } catch (err) {
      console.error("[RecurringBooking] Scan error:", err);
      setScanError(
        err.message || "Không thể kiểm tra tính khả dụng. Vui lòng thử lại."
      );
      setStep("setup");
    } finally {
      setScanning(false);
    }
  };

  const handleWeekToggle = (week) => {
    setSelectedWeeks((prev) =>
      prev.includes(week)
        ? prev.filter((w) => w !== week)
        : [...prev, week]
    );
  };

  const handleCreateBooking = async () => {
    if (selectedWeeks.length === 0) {
      setCreateError("Vui lòng chọn ít nhất 1 tuần để đặt phòng");
      return;
    }

    if (!purpose.trim()) {
      setCreateError("Vui lòng nhập mục đích sử dụng");
      return;
    }

    if (!attendeeCount || parseInt(attendeeCount) < 1) {
      setCreateError("Vui lòng nhập số lượng người tham gia");
      return;
    }

    const attendeeNum = parseInt(attendeeCount);
    const maxCapacity = selectedFacility?.capacity || 200;
    
    if (attendeeNum > maxCapacity) {
      setCreateError(`Số lượng người tham gia không được vượt quá ${maxCapacity} người (sức chứa của phòng).`);
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const now = new Date();
      const invalidSlots = [];

      // Build bookings array for selected weeks
      const bookings = selectedWeeks
        .map((week) => {
          const result = scanResults.find((r) => r.week === week);
          if (!result) return null;

          // Calculate date for this week
          const startDateObj = new Date(startDate);
          const weekDate = new Date(startDateObj);
          weekDate.setDate(startDateObj.getDate() + (week - 1) * 7);

          const isConflict = result.status === "CONFLICT_RESOLVED" || result.status === "CONFLICT";
          const targetFacilityId = isConflict && result.facilityId ? Number(result.facilityId) : Number(facilityId);
          if (isConflict) {
            console.log(`[RecurringBooking] Week ${week} - Using facility ID: ${targetFacilityId} (original: ${facilityId}, result.facilityId: ${result.facilityId})`);
          }

          // Build time slots for this week
          const slotBookings = selectedSlots.map((slotId) => {
            const slot = DEFAULT_SLOTS.find((s) => s.id === slotId);
            if (!slot) return null;

            const startDateTime = new Date(weekDate);
            const [startHour, startMin] = slot.start.split(":").map(Number);
            startDateTime.setHours(startHour, startMin, 0, 0);

            const endDateTime = new Date(weekDate);
            const [endHour, endMin] = slot.end.split(":").map(Number);
            endDateTime.setHours(endHour, endMin, 0, 0);

            // Validate slot không được là quá khứ hoặc đang diễn ra
            if (startDateTime < now) {
              const dateStr = weekDate.toLocaleDateString("vi-VN");
              invalidSlots.push(`Tuần ${week} (${dateStr}) - ${slot.label}`);
              return null;
            }

            return {
              facilityId: targetFacilityId,
              bookingTypeId: 1,
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              attendeeCount: parseInt(attendeeCount),
            };
          });

          return slotBookings.filter(Boolean);
        })
        .flat();

      // Kiểm tra nếu có slot không hợp lệ
      if (invalidSlots.length > 0) {
        setCreateError(
          `Không thể đặt các slot sau vì đã qua hoặc đang diễn ra: ${invalidSlots.join(", ")}`
        );
        setCreating(false);
        return;
      }

      // Kiểm tra nếu không có booking nào hợp lệ
      if (bookings.length === 0) {
        setCreateError("Không có slot nào hợp lệ để đặt phòng. Vui lòng chọn lại.");
        setCreating(false);
        return;
      }

      const purposeTrimmed = purpose.trim();
      const supportTrimmed = supportNote.trim();
      const noteText = supportTrimmed 
        ? (purposeTrimmed ? `${purposeTrimmed}\n\nYêu cầu hỗ trợ: ${supportTrimmed}` : supportTrimmed)
        : purposeTrimmed;

      const payload = {
        note: noteText,
        bookings: bookings,
      };

      console.log("[RecurringBooking] Creating recurring booking:", payload);
      console.log("[RecurringBooking] Bookings detail:", bookings.map((b, idx) => ({
        index: idx, facilityId: b.facilityId, startTime: b.startTime, endTime: b.endTime,
      })));
      const facilityIdGroups = bookings.reduce((acc, b) => {
        acc[b.facilityId] = (acc[b.facilityId] || 0) + 1;
        return acc;
      }, {});
      console.log("[RecurringBooking] Facility ID distribution:", facilityIdGroups);
      const result = await createRecurringBooking(payload);
      console.log("[RecurringBooking] Booking created:", result);

      setSuccessData({
        groupId: result.groupId || result.id,
        bookingCount: bookings.length,
        weeks: selectedWeeks.length,
      });
      setStep("success");
    } catch (err) {
      console.error("[RecurringBooking] Create error:", err);
      
      // Parse error message from backend
      let errorMessage = "Không thể tạo đặt phòng định kỳ. Vui lòng thử lại.";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Check if it's a conflict error (400 Bad Request)
        if (err.response.status === 400) {
          // Try to extract conflict message from various possible formats
          const message = errorData.message || errorData.error || errorData.msg || "";
          const messageLower = message.toLowerCase();
          
          const conflictKeywords = ["conflict", "xung đột", "trùng", "đã có lịch", "already booked", "occupied", "không thể đặt", "schedule conflict"];
          if (conflictKeywords.some(keyword => messageLower.includes(keyword))) {
            errorMessage = `❌ Không thể đặt phòng do bị trùng lịch!\n\n${message || "Bạn đã có booking khác vào cùng thời gian này. "}\n\nVui lòng kiểm tra lại lịch đặt phòng của bạn hoặc chọn thời gian khác.`;
          } else {
            errorMessage = message || "Dữ liệu đặt phòng không hợp lệ. Vui lòng kiểm tra lại thông tin.";
          }
        } else if (err.response.status === 403) {
          errorMessage = "Bạn không có quyền thực hiện thao tác này.";
        } else if (err.response.status === 500) {
          errorMessage = "Lỗi hệ thống. Vui lòng thử lại sau.";
        } else if (errorData.message || errorData.error || errorData.msg) {
          errorMessage = errorData.message || errorData.error || errorData.msg;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setCreateError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setStep("setup");
    setScanResults([]);
    setSelectedWeeks([]);
    setScanError("");
    setCreateError("");
    setSuccessData(null);
  };

  const availableCount = scanResults.filter((r) => r.status === "AVAILABLE").length;
  const conflictCount = scanResults.filter((r) => r.status === "CONFLICT_RESOLVED" || r.status === "CONFLICT").length;
  const unavailableCount = scanResults.filter((r) => r.status === "UNAVAILABLE" || r.status === "OCCUPIED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-orange-500" />
            Đặt phòng định kỳ
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Đặt lịch cho nhiều tuần liên tiếp (VD: Thứ 2, 4, 6 trong 10 tuần)
          </p>
        </div>
      </div>

      {/* Setup Step */}
      {step === "setup" && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            Bước 1: Thiết lập
          </h2>

          <div className="space-y-5">
            {/* Facility Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Loại phòng
              </label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="">Tất cả</option>
                {facilityTypes.map((type) => {
                  const typeId = typeof type === 'object' ? type.id : type;
                  const typeName = typeof type === 'object' ? (type.name || 'Unknown') : String(type);
                  return (
                    <option key={typeId} value={typeId}>
                      {typeName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Facility Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chọn phòng <span className="text-red-500">*</span>
              </label>
              {loadingFacilities ? (
                <div className="flex items-center gap-2 text-gray-500 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải danh sách phòng...
                </div>
              ) : (
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                >
                  <option value="">-- Chọn phòng --</option>
                  {facilities.map((facility) => {
                    const typeName = typeof facility.type === 'object' 
                      ? (facility.type?.name || facility.type?.type || 'Unknown')
                      : (facility.type || 'Unknown');
                    return (
                      <option key={facility.id} value={facility.id}>
                        {facility.name} ({facility.capacity || 0} người) - {typeName}
                      </option>
                    );
                  })}
                </select>
              )}
              {selectedFacility && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedFacility.description || "Không có mô tả"}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={todayYMD}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              />
            </div>

            {/* Number of Weeks */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Số tuần lặp lại <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={weeks}
                onChange={(e) => setWeeks(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Tối đa 20 tuần (1 học kỳ)
              </p>
            </div>

            {/* Slot Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                Chọn slot <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Slot đã qua / đang diễn ra sẽ bị khóa
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {DEFAULT_SLOTS.map((slot) => {
                  const expired = slotExpired(slot);
                  const ongoing = slotOngoing(slot);
                  const disabled = expired || ongoing;
                  const isSelected = selectedSlots.includes(slot.id);

                  let title = "";
                  if (expired) title = "Slot đã qua giờ";
                  else if (ongoing) title = "Slot đang diễn ra";

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSlotToggle(slot.id)}
                      disabled={disabled}
                      title={title}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        disabled
                          ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                          : isSelected
                          ? "bg-orange-50 border-orange-500 text-orange-700"
                          : "bg-white border-gray-300 text-gray-700 hover:border-orange-300"
                      }`}
                    >
                      <div className="text-xs">{slot.label}</div>
                      <div className="text-xs text-gray-500">{slot.start}-{slot.end}</div>
                      {expired && <div className="text-[10px] mt-1 text-gray-500">Đã qua giờ</div>}
                      {!expired && ongoing && <div className="text-[10px] mt-1 text-gray-500">Đang diễn ra</div>}
                    </button>
                  );
                })}
              </div>
              {selectedSlots.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Đã chọn {selectedSlots.length} slot(s)
                </p>
              )}
            </div>

            {scanError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{scanError}</p>
              </div>
            )}

            <Button
              onClick={handleScan}
              disabled={!facilityId || selectedSlots.length === 0 || scanning}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Bước 2: Kiểm tra tính khả dụng
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Scan Step (Loading) */}
      {step === "scan" && scanning && (
        <Card className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Đang kiểm tra tính khả dụng cho {weeks} tuần...</p>
        </Card>
      )}

      {/* Confirm Step */}
      {step === "confirm" && scanResults.length > 0 && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-orange-500" />
              Bước 3: Xác nhận đặt phòng
            </h2>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{availableCount}</div>
                  <div className="text-xs text-gray-600">Có sẵn</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{conflictCount}</div>
                  <div className="text-xs text-gray-600">Có thể thay thế</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{unavailableCount}</div>
                  <div className="text-xs text-gray-600">Không khả dụng</div>
                </div>
              </div>
            </div>

            {/* Week Results */}
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {scanResults.map((result) => {
                const isSelected = selectedWeeks.includes(result.week);
                const isAvailable = result.status === "AVAILABLE";
                const isConflict = result.status === "CONFLICT_RESOLVED" || result.status === "CONFLICT";
                const isUnavailable = result.status === "UNAVAILABLE" || result.status === "OCCUPIED";

                return (
                  <div
                    key={result.week}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "bg-orange-50 border-orange-500"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    } ${isUnavailable ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleWeekToggle(result.week)}
                          disabled={isUnavailable}
                          className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">
                            Tuần {result.week} - {new Date(result.date).toLocaleDateString("vi-VN")}
                          </div>
                          <div className="text-sm text-gray-600">{result.facilityName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAvailable && (
                          <Badge type="success" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Có sẵn
                          </Badge>
                        )}
                        {isConflict && (
                          <Badge type="warning" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Thay thế
                          </Badge>
                        )}
                        {isUnavailable && (
                          <Badge type="danger" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Không khả dụng
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedWeeks.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5 inline mr-2" />
                Vui lòng chọn ít nhất 1 tuần để đặt phòng
              </div>
            )}

            {/* Booking Details */}
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Thông tin đặt phòng</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mục đích sử dụng <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                  placeholder="VD: Lớp học SWP391, Họp định kỳ..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  Số lượng người tham gia <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedFacility?.capacity || 200}
                  value={attendeeCount}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = parseInt(value);
                    const maxCapacity = selectedFacility?.capacity || 200;
                    if (value && !isNaN(numValue) && numValue > maxCapacity) {
                      setAttendeeCount(maxCapacity.toString());
                      setCreateError(`Số lượng người tham gia không được vượt quá ${maxCapacity} người (sức chứa của phòng).`);
                    } else {
                      setAttendeeCount(value);
                      if (createError?.includes("Số lượng người tham gia không được vượt quá")) {
                        setCreateError("");
                      }
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${
                    attendeeCount && parseInt(attendeeCount) > (selectedFacility?.capacity || 200)
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                  placeholder={`Tối đa ${selectedFacility?.capacity || 200} người`}
                  required
                />
                {attendeeCount && parseInt(attendeeCount) > (selectedFacility?.capacity || 200) && (
                  <p className="text-xs text-red-600 mt-1">
                    Số lượng vượt quá sức chứa tối đa ({selectedFacility?.capacity || 200} người)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Yêu cầu hỗ trợ thiết bị (tùy chọn)
                </label>
                <textarea
                  value={supportNote}
                  onChange={(e) => setSupportNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                  placeholder="VD: Cần máy chiếu, micro, bảng trắng..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ghi chú yêu cầu hỗ trợ thiết bị khi đặt phòng (tính năng dành cho Giảng viên)
                </p>
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm whitespace-pre-line">{createError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={handleReset}
                  disabled={creating}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Quay lại
                </Button>
                <Button
                  onClick={handleCreateBooking}
                  disabled={
                    selectedWeeks.length === 0 || 
                    creating || 
                    !purpose.trim() || 
                    !attendeeCount || 
                    parseInt(attendeeCount) < 1 ||
                    parseInt(attendeeCount) > (selectedFacility?.capacity || 200)
                  }
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4 mr-2" />
                      Xác nhận đặt {selectedWeeks.length} tuần
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Success Step */}
      {step === "success" && successData && (
        <SuccessDialog
          isOpen={true}
          title="Đặt phòng định kỳ thành công!"
          message={`Đã tạo ${successData.bookingCount} đặt phòng cho ${successData.weeks} tuần. Mã nhóm: ${successData.groupId}`}
          onClose={() => {
            handleReset();
            window.location.href = "/history";
          }}
        />
      )}
    </div>
  );
}

