import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Search, Package, Building2, Eye, History } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import AdminLayout, { AdminHeader, AdminContent } from "../../components/layout/AdminLayout";

import {
  getEquipmentTypes,
  createEquipmentType,
  getEquipmentsByFacility,
  addEquipmentToFacility,
  updateFacilityEquipment,
  removeFacilityEquipment,
} from "../../services/equipmentService";

const toApiCondition = (uiCondition) => {
  const c = (uiCondition || "GOOD").toString().toLowerCase();
  if (c === "good" || c === "fair" || c === "poor") return c;
  if (uiCondition === "FAIR") return "fair";
  if (uiCondition === "POOR") return "poor";
  return "good";
};

const toUiCondition = (apiCondition) => {
  const c = (apiCondition || "good").toString().toLowerCase();
  if (c === "fair") return "FAIR";
  if (c === "poor") return "POOR";
  return "GOOD";
};

/** ✅ Hiển thị condition sang tiếng Việt */
const hienThiTinhTrang = (uiCondition) => {
  if (uiCondition === "FAIR") return "Khá";
  if (uiCondition === "POOR") return "Kém";
  return "Tốt";
};

const hienThiDanhMuc = (value) => {
  // value backend có thể là Visual/Audio/Network/General
  const v = (value || "").toString().toLowerCase();
  if (v === "visual") return "Hình ảnh";
  if (v === "audio") return "Âm thanh";
  if (v === "network") return "Mạng";
  if (v === "general") return "Chung";
  return value || "-";
};

export default function EquipmentManagement() {
  const { user } = useAuth();

  // types = quản lý loại thiết bị
  // instances = quản lý thiết bị theo phòng
  const [cheDoXem, setCheDoXem] = useState("types");
  const [phongDangChon, setPhongDangChon] = useState("");

  const [danhSachHienThi, setDanhSachHienThi] = useState([]);
  const [danhSachPhong, setDanhSachPhong] = useState([]);
  const [danhSachLoaiThietBi, setDanhSachLoaiThietBi] = useState([]);

  const [dangTai, setDangTai] = useState(true);
  const [tuKhoa, setTuKhoa] = useState("");

  const [hienModalThem, setHienModalThem] = useState(false);
  const [hienModalChiTiet, setHienModalChiTiet] = useState(false);
  const [thietBiDangChon, setThietBiDangChon] = useState(null);

  const [lichSuThietBi, setLichSuThietBi] = useState([]);
  const [tabChiTiet, setTabChiTiet] = useState("thong_tin"); // "thong_tin" | "lich_su"

  const [dangSua, setDangSua] = useState(null);

  const [duLieuForm, setDuLieuForm] = useState({
    name: "",
    equipmentTypeId: "",
    roomId: "",
    quantity: "",
    condition: "GOOD", // UI: GOOD/FAIR/POOR
    description: "",
  });

  const [hienModalTaoLoai, setHienModalTaoLoai] = useState(false);
  const [duLieuLoai, setDuLieuLoai] = useState({
    name: "",
    iconUrl: "",
    category: "General",
  });

  const xacDinhCampusId = useCallback(() => {
    let campusId = null;

    if (user?.campusId) campusId = user.campusId;
    else if (typeof user?.campus === "number") campusId = user.campus;
    else if (typeof user?.campus === "string") {
      const campusMap = { hcm: 2, hn: 1, dn: 3, ct: 4, qn: 5 };
      campusId = campusMap[user.campus.toLowerCase()] || null;
    }

    if (!campusId) campusId = 2; // mặc định HCM nếu thiếu
    return campusId;
  }, [user]);

  const taiDuLieuNen = useCallback(async () => {
    if (!user?.campus && !user?.campusId) {
      setDangTai(false);
      return;
    }

    setDangTai(true);
    try {
      const campusId = xacDinhCampusId();

      const [roomsData, typesData] = await Promise.all([
        api.getRooms({ campusId, includeInactive: true, allStatuses: true }),
        getEquipmentTypes().catch(() => []),
      ]);

      const rooms = Array.isArray(roomsData) ? roomsData : [];
      const types = Array.isArray(typesData) ? typesData : [];

      setDanhSachPhong(rooms);
      setDanhSachLoaiThietBi(types);

      // chọn phòng đầu tiên nếu đang ở chế độ theo phòng mà chưa chọn
      if (!phongDangChon && rooms[0]?.id) {
        setPhongDangChon(String(rooms[0].id));
      }
    } finally {
      setDangTai(false);
    }
  }, [phongDangChon, user, xacDinhCampusId]);

  const taiDanhSachHienThi = useCallback(async () => {
    setDangTai(true);
    try {
      if (cheDoXem === "types") {
        /** ✅ FIX LOOP: không gọi getEquipmentTypes ở đây nữa, dùng state đã load ở taiDuLieuNen */
        const types = danhSachLoaiThietBi;

        const rows = (types || []).map((t) => ({
          id: t.id ?? t._id ?? `${t.name}-${Math.random()}`,
          name: t.name ?? "Không rõ",
          category: t.category ?? "",
          iconUrl: t.iconUrl ?? "",
          roomId: null,
          roomName: null,
          quantity: null,
          status: "available",
          description: t.description ?? "",
          equipmentTypeId: t.id ?? t._id,
          isType: true,
          condition: null,
        }));

        setDanhSachHienThi(rows);
        return;
      }

      // cheDoXem === "instances"
      if (!phongDangChon) {
        setDanhSachHienThi([]);
        return;
      }

      const facilityId = Number(phongDangChon);
      const res = await getEquipmentsByFacility(facilityId);
      const facility = res?.facility ?? null;
      const list = Array.isArray(res?.equipment) ? res.equipment : [];

      const roomFallback = danhSachPhong.find((r) => String(r.id) === String(phongDangChon));
      const roomName = facility?.name ?? roomFallback?.name ?? `Phòng ${facilityId}`;

      const rows = list.map((it) => {
        const typeId = it.equipmentTypeId ?? it.typeId ?? it.equipment_type_id;
        const foundType = danhSachLoaiThietBi.find((t) => String(t.id ?? t._id) === String(typeId));

        return {
          id: it.id ?? it._id ?? `${typeId}-${(it.condition || "good")}-${Math.random()}`,
          name: foundType?.name ?? it.name ?? "Thiết bị",
          category: foundType?.category ?? it.category ?? "",
          iconUrl: foundType?.iconUrl ?? it.iconUrl ?? "",
          roomId: facility?.id ?? roomFallback?.id ?? facilityId,
          roomName,
          quantity: it.quantity ?? it.qty ?? 0,
          status: it.status ?? "available",
          description: it.description ?? "",
          equipmentTypeId: typeId ?? null,
          isType: false,
          condition: toUiCondition(it.condition),
          // để update/delete: cần condition dạng api nữa
          _apiCondition: (it.condition ?? "good").toString().toLowerCase(),
        };
      });

      setDanhSachHienThi(rows);
    } finally {
      setDangTai(false);
    }
  }, [cheDoXem, phongDangChon, danhSachPhong, danhSachLoaiThietBi]);

  useEffect(() => {
    taiDuLieuNen();
  }, [taiDuLieuNen]);

  useEffect(() => {
    taiDanhSachHienThi();
  }, [taiDanhSachHienThi]);

  const danhSachLoc = useMemo(() => {
    const term = tuKhoa.trim().toLowerCase();
    if (!term) return danhSachHienThi;

    return danhSachHienThi.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const category = (item.category || "").toLowerCase();
      const roomName = (item.roomName || "").toLowerCase();
      return name.includes(term) || category.includes(term) || roomName.includes(term);
    });
  }, [danhSachHienThi, tuKhoa]);

  const moModalThem = () => {
    setDangSua(null);
    setDuLieuForm({
      name: "",
      equipmentTypeId: "",
      roomId: phongDangChon || "",
      quantity: "",
      condition: "GOOD",
      description: "",
    });
    setHienModalThem(true);
  };

  const xuLyTaoLoai = async (e) => {
    e.preventDefault();
    try {
      await createEquipmentType(duLieuLoai);
      alert("Tạo loại thiết bị thành công!");
      setHienModalTaoLoai(false);
      setDuLieuLoai({ name: "", iconUrl: "", category: "General" });

      // ✅ reload types chuẩn (tránh lệch state)
      await taiDuLieuNen();
      await taiDanhSachHienThi();
    } catch {
      alert("Lỗi khi tạo loại thiết bị!");
    }
  };

  const xemChiTiet = (item) => {
    setThietBiDangChon(item);
    setTabChiTiet("thong_tin");
    setHienModalChiTiet(true);

    // backend chưa có API lịch sử
    setLichSuThietBi([]);
  };

  const moSua = (item) => {
    setDangSua(item);

    setDuLieuForm({
      name: item.name || "",
      equipmentTypeId: item.equipmentTypeId?.toString() || "",
      roomId: item.roomId?.toString() || phongDangChon || "",
      quantity: String(item.quantity ?? ""),
      condition: item.condition || "GOOD",
      description: item.description || "",
    });

    setHienModalThem(true);
  };

  const xoaThietBi = async (item) => {
    const ok = window.confirm("Bạn có chắc chắn muốn xóa thiết bị này khỏi phòng?");
    if (!ok) return;

    try {
      await removeFacilityEquipment(
        item.roomId,
        item.equipmentTypeId,
        item._apiCondition || toApiCondition(item.condition)
      );
      alert("Xóa thiết bị khỏi phòng thành công!");
      await taiDanhSachHienThi();
    } catch {
      alert("Lỗi khi xóa thiết bị!");
    }
  };

  const guiForm = async (e) => {
    e.preventDefault();

    try {
      const roomId = duLieuForm.roomId ? Number(duLieuForm.roomId) : null;
      const equipmentTypeId = duLieuForm.equipmentTypeId ? Number(duLieuForm.equipmentTypeId) : null;
      const quantity = Number(duLieuForm.quantity);

      if (!roomId) return alert("Vui lòng chọn phòng!");
      if (!equipmentTypeId) return alert("Vui lòng chọn loại thiết bị!");
      if (!quantity || quantity < 1) return alert("Số lượng phải >= 1");

      const conditionApi = toApiCondition(duLieuForm.condition);

      if (dangSua) {
        await updateFacilityEquipment(
          roomId,
          equipmentTypeId,
          dangSua._apiCondition || conditionApi,
          {
            quantity,
            condition: conditionApi,
            description: duLieuForm.description || "",
          }
        );
        alert("Cập nhật thiết bị thành công!");
      } else {
        await addEquipmentToFacility(roomId, {
          equipmentTypeId,
          quantity,
          condition: conditionApi,
        });
        alert("Thêm thiết bị vào phòng thành công!");
      }

      setHienModalThem(false);

      setCheDoXem("instances");
      setPhongDangChon(String(roomId));
      await taiDanhSachHienThi();
    } catch {
      alert(dangSua ? "Lỗi khi cập nhật thiết bị!" : "Lỗi khi thêm thiết bị!");
    }
  };

  return (
    <AdminLayout>
      <AdminHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên / danh mục / phòng..."
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setHienModalTaoLoai(true)}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Tạo loại thiết bị
              </Button>

              <Button onClick={moModalThem} className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Thêm thiết bị vào phòng
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setCheDoXem("types")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  cheDoXem === "types"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Xem theo loại thiết bị
              </button>

              <button
                onClick={() => setCheDoXem("instances")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  cheDoXem === "instances"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Xem theo phòng
              </button>
            </div>

            {cheDoXem === "instances" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Chọn phòng:</span>
                <select
                  value={phongDangChon}
                  onChange={(e) => setPhongDangChon(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">-- Chọn phòng --</option>
                  {danhSachPhong.map((room) => (
                    <option key={room.id} value={String(room.id)}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </AdminHeader>

      <AdminContent>
        {dangTai ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold text-gray-700">Tên thiết bị</th>
                    <th className="p-4 font-semibold text-gray-700">Danh mục</th>
                    <th className="p-4 font-semibold text-gray-700">Phòng</th>
                    <th className="p-4 font-semibold text-gray-700">Số lượng</th>
                    <th className="p-4 font-semibold text-gray-700">Trạng thái</th>
                    <th className="p-4 font-semibold text-gray-700 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {danhSachLoc.length > 0 ? (
                    danhSachLoc.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{item.name}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          {item.category ? (
                            <Badge type="info" className="text-xs">
                              {hienThiDanhMuc(item.category)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>

                        <td className="p-4">
                          {item.roomName ? (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Building2 className="w-4 h-4" />
                              {item.roomName}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">{cheDoXem === "types" ? "-" : "Chưa gán"}</span>
                          )}
                        </td>

                        <td className="p-4 text-gray-600">
                          {item.isType ? <span className="text-gray-400 italic">-</span> : `${item.quantity} cái`}
                        </td>

                        <td className="p-4">
                          <Badge
                            type={
                              item.status === "available"
                                ? "success"
                                : item.status === "maintenance"
                                ? "warning"
                                : "danger"
                            }
                          >
                            {item.status === "available"
                              ? "Sẵn sàng"
                              : item.status === "maintenance"
                              ? "Bảo trì"
                              : "Hỏng"}
                          </Badge>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => xemChiTiet(item)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {!item.isType && (
                              <>
                                <button
                                  onClick={() => moSua(item)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => xoaThietBi(item)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Xóa khỏi phòng"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        {cheDoXem === "instances" && !phongDangChon
                          ? "Hãy chọn phòng để xem danh sách thiết bị."
                          : "Không có dữ liệu phù hợp."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </AdminContent>

      {/* Modal thêm/sửa thiết bị */}
      {hienModalThem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {dangSua ? "Cập nhật thiết bị trong phòng" : "Thêm thiết bị vào phòng"}
                </h2>
                <button onClick={() => setHienModalThem(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ×
                </button>
              </div>

              <form onSubmit={guiForm} className="flex flex-col flex-1 min-h-0">
                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại thiết bị *</label>
                    <select
                      required
                      value={duLieuForm.equipmentTypeId}
                      onChange={(e) => {
                        const selectedType = danhSachLoaiThietBi.find((t) => String(t.id) === e.target.value);
                        setDuLieuForm({
                          ...duLieuForm,
                          equipmentTypeId: e.target.value,
                          name: selectedType ? selectedType.name : duLieuForm.name,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">-- Chọn loại thiết bị --</option>
                      {danhSachLoaiThietBi.map((type) => (
                        <option key={type.id} value={String(type.id)}>
                          {type.name} {type.category ? `(${hienThiDanhMuc(type.category)})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên thiết bị *</label>
                    <input
                      type="text"
                      required
                      value={duLieuForm.name}
                      onChange={(e) => setDuLieuForm({ ...duLieuForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ví dụ: Máy chiếu, Loa, Bộ phát wifi..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tên sẽ tự động điền khi chọn loại thiết bị (bạn có thể chỉnh sửa).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phòng *</label>
                      <select
                        required
                        value={duLieuForm.roomId}
                        onChange={(e) => setDuLieuForm({ ...duLieuForm, roomId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">-- Chọn phòng --</option>
                        {danhSachPhong.map((room) => (
                          <option key={room.id} value={String(room.id)}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={duLieuForm.quantity}
                        onChange={(e) => setDuLieuForm({ ...duLieuForm, quantity: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Ví dụ: 5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tình trạng *</label>
                    <select
                      required
                      value={duLieuForm.condition}
                      onChange={(e) => setDuLieuForm({ ...duLieuForm, condition: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="GOOD">Tốt</option>
                      <option value="FAIR">Khá</option>
                      <option value="POOR">Kém</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả (tùy chọn)</label>
                    <textarea
                      value={duLieuForm.description}
                      onChange={(e) => setDuLieuForm({ ...duLieuForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={3}
                      placeholder="Ghi chú thêm về thiết bị..."
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setHienModalThem(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary">
                    {dangSua ? "Cập nhật" : "Thêm"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Modal chi tiết */}
      {hienModalChiTiet && thietBiDangChon && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-6 h-6 text-orange-600" />
                    {thietBiDangChon.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Thông tin chi tiết thiết bị</p>
                </div>
                <button
                  onClick={() => {
                    setHienModalChiTiet(false);
                    setThietBiDangChon(null);
                    setLichSuThietBi([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="flex gap-2 mb-6 border-b">
                <button
                  onClick={() => setTabChiTiet("thong_tin")}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    tabChiTiet === "thong_tin"
                      ? "text-orange-600 border-b-2 border-orange-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Thông tin
                </button>

                <button
                  onClick={() => setTabChiTiet("lich_su")}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    tabChiTiet === "lich_su"
                      ? "text-orange-600 border-b-2 border-orange-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Lịch sử ({lichSuThietBi.length})
                  </div>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {tabChiTiet === "thong_tin" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phòng</label>
                        <p className="text-gray-900 font-medium mt-1">
                          {thietBiDangChon.roomName || <span className="text-gray-400 italic">-</span>}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-500">Số lượng</label>
                        <p className="text-gray-900 font-medium mt-1">
                          {thietBiDangChon.isType ? (
                            <span className="text-gray-400 italic">-</span>
                          ) : (
                            `${thietBiDangChon.quantity} cái`
                          )}
                        </p>
                      </div>

                      {!thietBiDangChon.isType && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Tình trạng</label>
                          <p className="text-gray-900 font-medium mt-1">
                            {hienThiTinhTrang(thietBiDangChon.condition)}
                          </p>
                        </div>
                      )}
                    </div>

                    {thietBiDangChon.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Mô tả</label>
                        <p className="text-gray-900 mt-1">{thietBiDangChon.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {tabChiTiet === "lich_su" && (
                  <div className="space-y-3">
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Hiện chưa có API lịch sử thiết bị.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setHienModalChiTiet(false);
                    setThietBiDangChon(null);
                    setLichSuThietBi([]);
                  }}
                >
                  Đóng
                </Button>

                {!thietBiDangChon.isType && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setHienModalChiTiet(false);
                      moSua(thietBiDangChon);
                    }}
                  >
                    Chỉnh sửa
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal tạo loại thiết bị */}
      {hienModalTaoLoai && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Card className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Tạo loại thiết bị mới</h2>
                <button
                  onClick={() => {
                    setHienModalTaoLoai(false);
                    setDuLieuLoai({ name: "", iconUrl: "", category: "General" });
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={xuLyTaoLoai} className="flex flex-col flex-1 min-h-0">
                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên loại thiết bị *</label>
                    <input
                      type="text"
                      required
                      value={duLieuLoai.name}
                      onChange={(e) => setDuLieuLoai({ ...duLieuLoai, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Ví dụ: Máy chiếu 4K, Loa hội trường..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Đường dẫn icon (tùy chọn)</label>
                    <input
                      type="url"
                      value={duLieuLoai.iconUrl}
                      onChange={(e) => setDuLieuLoai({ ...duLieuLoai, iconUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục *</label>
                    <select
                      required
                      value={duLieuLoai.category}
                      onChange={(e) => setDuLieuLoai({ ...duLieuLoai, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="Visual">Hình ảnh</option>
                      <option value="Audio">Âm thanh</option>
                      <option value="Network">Mạng</option>
                      <option value="General">Chung</option>
                    </select>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setHienModalTaoLoai(false);
                      setDuLieuLoai({ name: "", iconUrl: "", category: "General" });
                    }}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary">
                    Tạo mới
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
