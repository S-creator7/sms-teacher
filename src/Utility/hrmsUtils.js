// src/Utility/hrmsUtils.js

// Status badge styling per HRMS Spec Matrix
export function getStatusBadge(status) {
  const s = String(status || "").toUpperCase();
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border";

  // Green / Emerald
  if (["PRESENT", "APPROVED", "VERIFIED", "PAID", "ACTIVE", "COMPLETED"].includes(s)) {
    return `${base} bg-emerald-50 text-emerald-800 border-emerald-200`;
  }
  // Amber / Orange
  if ([
    "PENDING",
    "PENDING_HOD",
    "PENDING_PRINCIPAL",
    "REQUESTED",
    "SUBMITTED",
    "IN_PROGRESS",
    "SELF_PENDING",
    "SELF_SUBMITTED"
  ].includes(s)) {
    return `${base} bg-amber-50 text-amber-800 border-amber-200`;
  }
  // Rose / Red
  if (["REJECTED", "CANCELLED", "CANCELED", "ABSENT", "TERMINATED"].includes(s)) {
    return `${base} bg-rose-50 text-rose-800 border-rose-200`;
  }
  // Purple
  if (["LATE", "HALF_DAY", "EARLY_DEPARTURE"].includes(s)) {
    return `${base} bg-purple-50 text-purple-800 border-purple-200`;
  }
  // Gray / Default
  if (["WEEKLY_OFF", "HOLIDAY", "OFF", "EXPIRED"].includes(s)) {
    return `${base} bg-gray-100 text-gray-700 border-gray-200`;
  }

  return `${base} bg-gray-100 text-gray-700 border-gray-200`;
}

// Date -> "09 Oct 2026"
export function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Time -> "08:30 AM"
export function formatTime(value) {
  if (!value) return "-";
  if (typeof value === "string" && value.includes(":") && !value.includes("T")) {
    const parts = value.split(":");
    const hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    const hr12 = hour % 12 || 12;
    return `${hr12}:${minute} ${ampm}`;
  }
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Currency -> "₹65,000"
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount));
}