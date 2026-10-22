import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  LuRefreshCw,
  LuCalendar,
  LuClock,
  LuBriefcase,
  LuGraduationCap,
  LuArrowRight,
  LuUser,
  LuWallet,
  LuBox,
  LuCircleCheck,
  LuCircleX,
} from "react-icons/lu";
import { getHrmsDashboard } from "../../Utility/hrmsApi";
import { formatTime } from "../../Utility/hrmsUtils";

export default function HrmsDashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  async function load(showToast = false) {
    try {
      setLoading(true);
      const res = await getHrmsDashboard();
      // Backend shape: { status, code, message, resources: { data: {...} } }
      setData(res?.resources?.data || null);
      if (showToast) toast.success("Dashboard refreshed");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // -------- Backend fields mapping (exact) --------
  const employee = data?.employee || null;
  const attendanceToday = data?.attendance_today || null;
  const leaveBalances = Array.isArray(data?.leave_balances) ? data.leave_balances : [];
  const pendingLeaveRequests = data?.pending_leave_requests ?? 0;
  const nextDuty = data?.next_duty || null;
  const latestPayslip = data?.latest_payslip || null;
  const shift = data?.shift || null;

  // -------- Derived values --------
  const fullName = employee?.name || "Faculty Member";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Teacher HRMS Overview
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Your profile, today's attendance, shift schedule, and quick links
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm text-gray-700 disabled:opacity-50"
        >
          <LuRefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-500" : ""}`}
          />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-xs font-semibold text-gray-500">
            Loading your HRMS summary...
          </p>
        </div>
      ) : (
        <>
          {/* ================= PROFILE HEADER ================= */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-bold text-xl flex items-center justify-center shadow-md">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900 capitalize">
                    {fullName}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {employee?.employee_code || "FACULTY"}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-600 mt-0.5">
                  {employee?.designation_title || "Teacher"} &bull;{" "}
                  {employee?.department_name || "Academics"}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                  <span>Employee ID: #{employee?.employee_id || "-"}</span>
                  <span>&bull;</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Link
                to="/hrms/profile"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-700"
              >
                <LuUser className="w-3.5 h-3.5 text-gray-500" />
                Service Book
              </Link>
              <Link
                to="/hrms/leaves"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition shadow-sm"
              >
                <LuCalendar className="w-3.5 h-3.5" />
                Apply Leave
              </Link>
            </div>
          </div>

          {/* ================= QUICK STATS ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Today's Attendance */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Today
                </span>
                {attendanceToday?.status === "PRESENT" ? (
                  <LuCircleCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <LuCircleX className="w-4 h-4 text-gray-400" />
                )}
              </div>
              {attendanceToday ? (
                <>
                  <p className="text-sm font-bold text-gray-900 mt-2">
                    {attendanceToday.status || "Marked"}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">
                    In: {formatTime(attendanceToday.punch_in) || "-"} | Out:{" "}
                    {formatTime(attendanceToday.punch_out) || "-"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-400 mt-2">Not Marked</p>
                  <p className="text-[10px] text-gray-400 mt-1">No punch recorded today</p>
                </>
              )}
            </div>

            {/* Current Shift */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Shift
                </span>
                <LuClock className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-sm font-bold text-gray-900 mt-2">
                {shift?.shift_name || "Not Assigned"}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                {shift?.start_time?.slice(0, 5) || "--:--"} -{" "}
                {shift?.end_time?.slice(0, 5) || "--:--"}
              </p>
            </div>

            {/* Pending Leave Requests */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Pending Leaves
                </span>
                <LuCalendar className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">
                {pendingLeaveRequests}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Awaiting approval</p>
            </div>

            {/* Latest Payslip */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Latest Payslip
                </span>
                <LuWallet className="w-4 h-4 text-purple-500" />
              </div>
              {latestPayslip ? (
                <>
                  <p className="text-sm font-bold text-gray-900 mt-2">
                    {latestPayslip.month_name ||
                      `${latestPayslip.month}/${latestPayslip.year}`}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Net: ₹{latestPayslip.net_salary ?? "-"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-400 mt-2">No Record</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Payslip not generated
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ================= SHIFT + DUTY + LEAVES ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Shift Details */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <LuClock className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-gray-900">Today's Shift</h3>
                </div>
                <span className="text-[11px] font-semibold text-gray-500">
                  {new Date().toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>

              {shift ? (
                <>
                  <div className="bg-gray-50/80 rounded-xl p-3.5 space-y-2 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Shift Name:</span>
                      <span className="text-xs font-bold text-gray-800">
                        {shift.shift_name} ({shift.shift_code})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Timings:</span>
                      <span className="text-xs font-mono font-semibold text-gray-700">
                        {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Grace Period:</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {shift.grace_period_minutes ?? 0} mins
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Half Day Late:</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {shift.half_day_late_threshold_minutes ?? 0} mins
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        Full Day Min
                      </span>
                      <p className="text-sm font-bold font-mono text-gray-800 mt-0.5">
                        {shift.min_work_hours_full_day || "-"} hrs
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        Half Day Min
                      </span>
                      <p className="text-sm font-bold font-mono text-gray-800 mt-0.5">
                        {shift.min_work_hours_half_day || "-"} hrs
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">
                  No shift assigned currently
                </div>
              )}
            </div>

            {/* Next Duty */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <LuBriefcase className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-gray-900">Next Duty</h3>
                </div>
                <Link
                  to="/hrms/attendance"
                  className="text-xs text-orange-600 hover:underline font-semibold"
                >
                  Details
                </Link>
              </div>

              {nextDuty ? (
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                  <span className="text-xs font-bold text-blue-900">
                    {nextDuty.duty_type || "Duty"}
                  </span>
                  <p className="text-[11px] text-blue-700">
                    {nextDuty.duty_date
                      ? new Date(nextDuty.duty_date).toLocaleDateString()
                      : "-"}
                  </p>
                  {nextDuty.location && (
                    <p className="text-[11px] text-blue-600">{nextDuty.location}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">
                  No upcoming duty assigned
                </div>
              )}

              <div className="pt-2">
                <Link
                  to="/hrms/attendance"
                  className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-gray-700 hover:text-orange-600 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                  View Duty Roster <LuArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Leave Balances */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <LuCalendar className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold text-gray-900">Leave Balances</h3>
                </div>
                <Link
                  to="/hrms/leaves"
                  className="text-xs text-orange-600 hover:underline font-semibold"
                >
                  Manage
                </Link>
              </div>

              {leaveBalances.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No leave quota records found
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {leaveBalances.map((b, idx) => (
                    <div
                      key={b.leave_type_code || idx}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center"
                    >
                      <span className="text-[11px] font-bold text-gray-600 truncate block">
                        {b.leave_type_name || b.leave_type_code}
                      </span>
                      <p className="text-xl font-black text-orange-600 mt-1">
                        {b.remaining_days ?? b.balance ?? 0}
                      </p>
                      <span className="text-[10px] text-gray-400">Days Remaining</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <Link
                  to="/hrms/leaves"
                  className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 py-2 rounded-xl transition"
                >
                  Apply Leave / Gate Pass <LuArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ================= MODULES ================= */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              HRMS Modules & Services
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Link to="/hrms/profile" className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition text-center group">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition">
                  <LuUser className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800 block">Service Book</span>
                <span className="text-[10px] text-gray-400">Profile & Docs</span>
              </Link>

              <Link to="/hrms/attendance" className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition text-center group">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition">
                  <LuClock className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800 block">Attendance</span>
                <span className="text-[10px] text-gray-400">Punches & Shifts</span>
              </Link>

              <Link to="/hrms/leaves" className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition text-center group">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition">
                  <LuCalendar className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800 block">Leaves & Pass</span>
                <span className="text-[10px] text-gray-400">Gate Passes</span>
              </Link>

              <Link to="/hrms/payroll" className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition text-center group">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition">
                  <LuWallet className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800 block">Payroll</span>
                <span className="text-[10px] text-gray-400">Payslips & Loans</span>
              </Link>

              <Link to="/hrms/cpd" className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition text-center group">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition">
                  <LuGraduationCap className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800 block">CPD Tracker</span>
                <span className="text-[10px] text-gray-400">NEP 50 Hours</span>
              </Link>

              <Link to="/hrms/assets" className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition text-center group">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition">
                  <LuBox className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-800 block">Assets & Exit</span>
                <span className="text-[10px] text-gray-400">Custody Items</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}