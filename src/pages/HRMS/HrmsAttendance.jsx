import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  LuCalendar,
  LuClock,
  LuBriefcase,
  LuUserCheck,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
import {
  getAttendanceSummary,
  getAttendanceToday,
  getShiftTimings,
  getDutyRosters,
  getProxySchedule,
} from "../../Utility/hrmsApi";
import { getStatusBadge, formatDate } from "../../Utility/hrmsUtils";

// ---------- Helpers ----------
function extractArray(res) {
  const data = res?.resources?.data ?? res?.data ?? res;

  if (Array.isArray(data)) return data;

  // Handle APIs returning { items: [] }, { logs: [] }, etc.
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.duties)) return data.duties;
  if (Array.isArray(data?.proxies)) return data.proxies;
  if (Array.isArray(data?.daily_records)) return data.daily_records;

  // Handle numeric-keyed objects: { "0": {...}, "1": {...} }
  if (data && typeof data === "object") {
    const vals = Object.values(data).filter(
      (item) => item && typeof item === "object"
    );
    if (vals.length > 0) return vals;
  }

  return [];
}

// Format date as YYYY-MM-DD for backend query params
function formatDateForApi(d) {
  const date = new Date(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Trim time string "09:00:00" -> "09:00"
function trimTime(t) {
  if (!t || typeof t !== "string") return "-";
  return t.slice(0, 5);
}

export default function HrmsAttendance() {
  const [activeTab, setActiveTab] = useState("LOGS"); // 'LOGS' | 'DUTIES' | 'PROXIES' | 'SHIFT'
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [loading, setLoading] = useState(true);

  // Data states
  const [attendanceData, setAttendanceData] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);
  const [shiftData, setShiftData] = useState(null);
  const [duties, setDuties] = useState([]);
  const [proxies, setProxies] = useState([]);

  // ===================== LOADERS =====================

  const loadAttendance = async (m, y) => {
    try {
      setLoading(true);
      const [summaryRes, todayRes] = await Promise.all([
        getAttendanceSummary(m, y),
        getAttendanceToday().catch(() => null),
      ]);
      setAttendanceData(summaryRes?.resources?.data || summaryRes?.data || null);
      setTodayStatus(todayRes?.resources?.data || todayRes?.data || null);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to load attendance summary"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTabDetails = async (tab) => {
    try {
      if (tab === "SHIFT") {
        const res = await getShiftTimings();
        const data = res?.resources?.data ?? res?.data ?? res;
        setShiftData(data && typeof data === "object" ? data : null);
      } else if (tab === "DUTIES") {
        // ✅ Current month range — YYYY-MM-DD format
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0); // last day of month

        const startDate = formatDateForApi(firstDay);
        const endDate = formatDateForApi(lastDay);

        const res = await getDutyRosters(startDate, endDate);
        setDuties(extractArray(res));
      } else if (tab === "PROXIES") {
        const res = await getProxySchedule();
        setProxies(extractArray(res));
      }
    } catch (err) {
      console.error(`Failed to load ${tab}:`, err);
      toast.error(
        err.response?.data?.message || `Failed to load ${tab.toLowerCase()}`
      );
    }
  };

  // ===================== EFFECTS =====================

  useEffect(() => {
    loadAttendance(month, year);
  }, [month, year]);

  // Reload duties when month/year changes AND duties tab is active
  useEffect(() => {
    if (activeTab === "DUTIES") {
      loadTabDetails("DUTIES");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  // Load tab-specific data on first tab switch
  useEffect(() => {
    if (activeTab !== "LOGS") {
      loadTabDetails(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ===================== HANDLERS =====================

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // ===================== DERIVED =====================

  const summary = attendanceData?.summary || {};
  const logs = attendanceData?.daily_records || [];

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ============ Header ============ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Attendance, Shifts & Rosters
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Biometric punch logs, duty schedule, substitute proxy assignments,
            and timing rules
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-white rounded-lg text-gray-600 transition"
          >
            <LuChevronLeft />
          </button>
          <span className="text-xs font-bold text-gray-800 px-2 min-w-[120px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-white rounded-lg text-gray-600 transition"
          >
            <LuChevronRight />
          </button>
        </div>
      </div>

      {/* ============ Tabs ============ */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
        <button
          onClick={() => handleTabChange("LOGS")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === "LOGS"
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <LuCalendar /> Monthly Punch Logs
        </button>
        <button
          onClick={() => handleTabChange("DUTIES")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === "DUTIES"
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <LuBriefcase /> Duty Rosters ({duties.length})
        </button>
        <button
          onClick={() => handleTabChange("PROXIES")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === "PROXIES"
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <LuClock /> Proxy Substitution
        </button>
        <button
          onClick={() => handleTabChange("SHIFT")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === "SHIFT"
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <LuUserCheck /> Shift Timings
        </button>
      </div>

      {/* ============ TAB 1: Attendance Logs & Summary ============ */}
      {activeTab === "LOGS" && (
        <div className="space-y-6">
          {/* Counters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-semibold uppercase">
                Present
              </span>
              <p className="text-2xl font-bold text-emerald-950 mt-1">
                {summary.present_days ?? 0}
              </p>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-[10px] text-rose-700 font-semibold uppercase">
                Absent
              </span>
              <p className="text-2xl font-bold text-rose-950 mt-1">
                {summary.absent_days ?? 0}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <span className="text-[10px] text-purple-700 font-semibold uppercase">
                Late In
              </span>
              <p className="text-2xl font-bold text-purple-950 mt-1">
                {summary.late_days ?? 0}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-[10px] text-amber-700 font-semibold uppercase">
                Half Days
              </span>
              <p className="text-2xl font-bold text-amber-950 mt-1">
                {summary.half_days ?? 0}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] text-blue-700 font-semibold uppercase">
                Leaves
              </span>
              <p className="text-2xl font-bold text-blue-950 mt-1">
                {summary.leave_days ?? 0}
              </p>
            </div>
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
              <span className="text-[10px] text-teal-700 font-semibold uppercase">
                On Duty
              </span>
              <p className="text-2xl font-bold text-teal-950 mt-1">
                {summary.on_duty_days ?? 0}
              </p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <span className="text-[10px] text-indigo-700 font-semibold uppercase">
                Total Days
              </span>
              <p className="text-2xl font-bold text-indigo-950 mt-1">
                {summary.total_days ?? 0}
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <span className="text-[10px] text-orange-700 font-semibold uppercase">
                Late Minutes
              </span>
              <p className="text-2xl font-bold text-orange-950 mt-1">
                {summary.total_late_minutes ?? 0}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900">
              Punch History & Daily Time Logs ({monthNames[month - 1]} {year})
            </h2>

            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
                Loading attendance logs...
              </div>
            ) : logs.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-10">
                No attendance logs found for this period.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Punch In</th>
                      <th className="p-3">Punch Out</th>
                      <th className="p-3">Late Mins</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-900">
                          {formatDate(
                            log.attendance_date || log.date || log.log_date
                          )}
                        </td>
                        <td className="p-3 text-gray-700 font-mono">
                          {log.punch_in || "--:--"}
                        </td>
                        <td className="p-3 text-gray-700 font-mono">
                          {log.punch_out || "--:--"}
                        </td>
                        <td className="p-3">
                          {log.late_minutes > 0 ? (
                            <span className="text-rose-600 font-bold">
                              +{log.late_minutes} m
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="p-3">
                          {getStatusBadge(log.status || "PRESENT")}
                        </td>
                        <td className="p-3 text-gray-500">
                          {log.remarks || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB 2: Duty Rosters ============ */}
      {activeTab === "DUTIES" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              Institutional Duty Rosters ({monthNames[month - 1]} {year})
            </h2>
            <p className="text-xs text-gray-500">
              Morning assembly, exam invigilation, recess floor monitoring, and
              bus boarding duties
            </p>
          </div>

          {duties.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">
              No specific duty rosters assigned for this month.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {duties.map((duty, idx) => (
                <div
                  key={duty.duty_id || duty.id || idx}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">
                      {(duty.duty_type || duty.type || "DUTY")?.replace(
                        /_/g,
                        " "
                      )}
                    </span>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                      {formatDate(duty.duty_date || duty.date)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      <strong>Timing:</strong> {trimTime(duty.start_time)} -{" "}
                      {trimTime(duty.end_time)}
                    </p>
                    <p>
                      <strong>Location:</strong>{" "}
                      {duty.location || duty.venue || "Campus"}
                    </p>
                  </div>
                  {duty.instructions && (
                    <p className="text-xs text-gray-500 italic bg-white p-2.5 rounded-lg border border-gray-100 mt-2">
                      "{duty.instructions}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ TAB 3: Proxy Substitution ============ */}
      {activeTab === "PROXIES" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              Proxy & Substitution Assignments
            </h2>
            <p className="text-xs text-gray-500">
              Periods where you have been assigned to substitute classes for
              colleagues on leave
            </p>
          </div>

          {proxies.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">
              No substitute periods assigned for today.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proxies.map((proxy, idx) => (
                <div
                  key={proxy.proxy_id || proxy.id || idx}
                  className="p-4 rounded-xl border border-gray-200 bg-purple-50/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">
                      {proxy.class_name || "-"} &bull; Period #
                      {proxy.period_number ?? "-"}
                    </span>
                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      {trimTime(proxy.start_time)} - {trimTime(proxy.end_time)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      <strong>Subject:</strong>{" "}
                      {proxy.subject_name || proxy.subject || "-"}
                    </p>
                    <p>
                      <strong>Absent Faculty:</strong>{" "}
                      {proxy.absent_teacher_name ||
                        proxy.absent_faculty ||
                        "-"}
                    </p>
                  </div>
                  {proxy.instructions && (
                    <p className="text-xs text-gray-500 italic bg-white p-2.5 rounded-lg border border-gray-100 mt-2">
                      "{proxy.instructions}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ TAB 4: Shift Timings ============ */}
      {activeTab === "SHIFT" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              Shift Configuration & Grace Periods
            </h2>
            <p className="text-xs text-gray-500">
              Institutional working hours and late punch-in tolerance limits
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-gray-50 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">
                Shift Name
              </span>
              <p className="text-lg font-bold text-gray-900">
                {shiftData?.shift_name || "Morning"}{" "}
                {shiftData?.shift_code && (
                  <span className="text-xs text-orange-600 font-semibold">
                    ({shiftData.shift_code})
                  </span>
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">
                Scheduled Hours
              </span>
              <p className="text-lg font-bold text-gray-900">
                {trimTime(shiftData?.start_time)} -{" "}
                {trimTime(shiftData?.end_time)}
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">
                Grace Period
              </span>
              <p className="text-lg font-bold text-gray-900">
                {shiftData?.grace_period_minutes ?? 0} Minutes
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">
                Half-Day Late Threshold
              </span>
              <p className="text-lg font-bold text-gray-900">
                {shiftData?.half_day_late_threshold_minutes ?? 0} Minutes
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">
                Full Day Min Hours
              </span>
              <p className="text-lg font-bold text-gray-900">
                {shiftData?.min_work_hours_full_day ?? "-"} hrs
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">
                Half Day Min Hours
              </span>
              <p className="text-lg font-bold text-gray-900">
                {shiftData?.min_work_hours_half_day ?? "-"} hrs
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">
                Effective From
              </span>
              <p className="text-sm font-bold text-gray-900">
                {formatDate(shiftData?.effective_from)}
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">
                Effective To
              </span>
              <p className="text-sm font-bold text-gray-900">
                {formatDate(shiftData?.effective_to)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}