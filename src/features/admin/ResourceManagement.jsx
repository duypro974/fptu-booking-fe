import { useState } from "react";
import { Building, Package, Users } from "lucide-react";
import RoomManagement from "./RoomManagement";
import EquipmentManagement from "./EquipmentManagement";
import ClubManagement from "./ClubManagement";

export default function ResourceManagement() {
  const [activeTab, setActiveTab] = useState("rooms");

  const tabs = [
    { id: "rooms", label: "Quản lý Phòng", icon: Building },
    { id: "equipment", label: "Quản lý Thiết bị", icon: Package },
    { id: "clubs", label: "Quản lý CLB", icon: Users },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài nguyên</h1>
          <p className="text-gray-500">Quản lý phòng, thiết bị và câu lạc bộ trong hệ thống.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
                  ${isActive
                    ? "bg-orange-50 text-orange-700 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-orange-600" : "text-gray-400"}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "rooms" && <RoomManagement />}
        {activeTab === "equipment" && <EquipmentManagement />}
        {activeTab === "clubs" && <ClubManagement />}
      </div>
    </div>
  );
}

