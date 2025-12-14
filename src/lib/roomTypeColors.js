/* eslint-disable no-unused-vars */
// src/lib/roomTypeColors.js
// Mapping room type names to Tailwind color classes for consistent UI
const MAP = {
  LECTURE: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-700",
    accent: "bg-amber-500",
    labelBg: "bg-amber-50",
    labelText: "text-amber-700",
  },
  SEMINAR: {
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    text: "text-indigo-700",
    accent: "bg-indigo-500",
    labelBg: "bg-indigo-50",
    labelText: "text-indigo-700",
  },
  LAB: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-700",
    accent: "bg-emerald-500",
    labelBg: "bg-emerald-50",
    labelText: "text-emerald-700",
  },
  SPORTS: {
    bg: "bg-rose-50",
    border: "border-rose-100",
    text: "text-rose-700",
    accent: "bg-rose-500",
    labelBg: "bg-rose-50",
    labelText: "text-rose-700",
  },
  AUDITORIUM: {
    bg: "bg-purple-50",
    border: "border-purple-100",
    text: "text-purple-700",
    accent: "bg-purple-500",
    labelBg: "bg-purple-50",
    labelText: "text-purple-700",
  },
  MEETING: {
    bg: "bg-sky-50",
    border: "border-sky-100",
    text: "text-sky-700",
    accent: "bg-sky-500",
    labelBg: "bg-sky-50",
    labelText: "text-sky-700",
  },
  CLASSROOM: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
    accent: "bg-blue-500",
    labelBg: "bg-blue-50",
    labelText: "text-blue-700",
  },
  DEFAULT: {
    bg: "bg-gray-50",
    border: "border-gray-100",
    text: "text-gray-700",
    accent: "bg-gray-500",
    labelBg: "bg-gray-50",
    labelText: "text-gray-700",
  },
};

export function getRoomTypeColor(typeName) {
  if (!typeName) return MAP.DEFAULT;

  // Normalize and remove diacritics for better matching (e.g., tiếng Việt)
  let norm = String(typeName).trim().toUpperCase();
  try {
    norm = norm.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  } catch (e) {
    // environment may not support Unicode property escapes; fallback to simple replace
    norm = norm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // 1) Exact key match
  if (MAP[norm]) return MAP[norm];

  // 2) Substring match for English keys (e.g., 'SEMINAR' in 'SEMINAR ROOM')
  for (const k of Object.keys(MAP)) {
    if (k === "DEFAULT") continue;
    if (norm.includes(k)) return MAP[k];
  }

  // 3) Keyword mapping that covers common Vietnamese / alternate names
  const KEYWORDS = [
    { key: "LECTURE", words: ["LECTURE", "GIANG", "GIẢNG", "GIANG DUONG", "GIẢNG ĐƯỜNG", "GIẢNGDUONG"] },
    { key: "SEMINAR", words: ["SEMINAR", "HOI THAO", "HỘI THẢO", "HỘI THAO"] },
    { key: "LAB", words: ["LAB", "THI NGHIEM", "THÍ NGHIỆM", "PHONG THI NGHIEM"] },
    { key: "SPORTS", words: ["SPORT", "SAN", "SÂN", "BONG", "THỂ THAO", "THE THAO"] },
    { key: "AUDITORIUM", words: ["AUDITORIUM", "HOI TRUONG", "HỘI TRƯỜNG", "HOI TRUONG"] },
    { key: "MEETING", words: ["MEET", "PHONG HOP", "PHÒNG HỌP", "HOP"] },
    { key: "CLASSROOM", words: ["CLASS", "PHONG HOC", "PHÒNG HỌC", "LOP"] },
  ];

  for (const item of KEYWORDS) {
    for (const w of item.words) {
      if (norm.includes(w)) return MAP[item.key] || MAP.DEFAULT;
    }
  }

  return MAP.DEFAULT;
}

export default MAP;
