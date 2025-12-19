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
  ArrowRight,
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

export default function RecurringBooking() {
  const { user } = useAuth();
  const [step, setStep] = useState("setup"); // "setup" | "scan" | "confirm" | "success"

  // Setup state
  const [facilityId, setFacilityId] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [startDate, setStartDate] = useState(() => toLocalYMD(new Date()));
  const [weeks, setWeeks] = useState(10);
  const [capacity, setCapacity] = useState("");
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

  // Load facilities and types
  useEffect(() => {
    if (!user) return;
    loadFacilityTypes();
    loadFacilities();
  }, [user, typeId, capacity]);

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
      if (capacity) filters.capacity = Number(capacity);

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
    setSelectedSlots((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId]
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
        capacity: capacity ? Number(capacity) : 0,
        typeId: typeId ? Number(typeId) : 0,
      };

      console.log("[RecurringBooking] Scanning availability:", payload);
      const results = await scanRecurringAvailability(payload);
      console.log("[RecurringBooking] Scan results:", results);

      setScanResults(Array.isArray(results) ? results : []);
      setStep("confirm");

      // Auto-select all available weeks
      const availableWeeks = results
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

    setCreating(true);
    setCreateError("");

    try {
      // Build bookings array for selected weeks
      const bookings = selectedWeeks
        .map((week) => {
          const result = scanResults.find((r) => r.week === week);
          if (!result) return null;

          // Calculate date for this week
          const startDateObj = new Date(startDate);
          const weekDate = new Date(startDateObj);
          weekDate.setDate(startDateObj.getDate() + (week - 1) * 7);

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

            // Use original facilityId for all bookings
            // Backend will handle alternative facilities for CONFLICT_RESOLVED status
            // The scan result's facilityName is just for display
            return {
              facilityId: Number(facilityId), // Always use the original selected facility
              bookingTypeId: 1, // Normal booking
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              attendeeCount: parseInt(attendeeCount),
            };
          });

          return slotBookings.filter(Boolean);
        })
        .flat();

      // Combine purpose and support note for the note field
      let noteText = purpose.trim();
      if (supportNote.trim()) {
        noteText = supportNote.trim();
        if (purpose.trim()) {
          noteText = `${purpose.trim()}\n\nYêu cầu hỗ trợ: ${supportNote.trim()}`;
        }
      }

      const payload = {
        note: noteText,
        bookings: bookings,
      };

      console.log("[RecurringBooking] Creating recurring booking:", payload);
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
      setCreateError(
        err.message || "Không thể tạo đặt phòng định kỳ. Vui lòng thử lại."
      );
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

            {/* Capacity Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                Sức chứa tối thiểu
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder="Không giới hạn"
              />
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chọn slot <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {DEFAULT_SLOTS.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleSlotToggle(slot.id)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedSlots.includes(slot.id)
                        ? "bg-orange-50 border-orange-500 text-orange-700"
                        : "bg-white border-gray-300 text-gray-700 hover:border-orange-300"
                    }`}
                  >
                    <div className="text-xs">{slot.label}</div>
                    <div className="text-xs text-gray-500">{slot.start}-{slot.end}</div>
                  </button>
                ))}
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
                  max={selectedFacility?.capacity || 999}
                  value={attendeeCount}
                  onChange={(e) => setAttendeeCount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder={`Tối đa ${selectedFacility?.capacity || "N/A"} người`}
                  required
                />
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
                  <p className="text-sm">{createError}</p>
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
                  disabled={selectedWeeks.length === 0 || creating || !purpose.trim() || !attendeeCount}
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

