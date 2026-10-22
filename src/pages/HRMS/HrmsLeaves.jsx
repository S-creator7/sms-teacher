import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  LuCalendar,
  LuPlus,
  LuX,
  LuDownload,
  LuTicketCheck,
} from "react-icons/lu";
import {
  getLeaveBalances,
  getLeaveTypes,
  applyLeave,
  getLeaveHistory,
  cancelLeave,
  getGatePasses,
  requestGatePass,
  cancelGatePass,
  downloadGatePass,
} from "../../Utility/hrmsApi";
import { getStatusBadge, formatDate, formatTime } from "../../Utility/hrmsUtils";

// ===================== HELPERS =====================

/**
 * Backend returns numeric-keyed objects:
 *   { "0": {...}, "1": {...} }
 * This converts to array. Also handles nested { data: {...} } shapes.
 */
function extractArray(res, ...keys) {
  if (!res) return [];

  let root = res?.data ?? res;
  root = root?.resources?.data ?? root?.data ?? root;

  if (Array.isArray(root)) return root;

  if (!root || typeof root !== "object") return [];

  // Nested { data: {...} }
  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    const nested = root.data;
    const vals = Object.values(nested).filter(
      (item) => item && typeof item === "object"
    );
    if (vals.length > 0) return vals;
  }

  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key];
    if (root[key] && typeof root[key] === "object") {
      const vals = Object.values(root[key]).filter(
        (item) => item && typeof item === "object"
      );
      if (vals.length > 0) return vals;
    }
  }

  // Last resort: numeric-keyed object directly
  return Object.values(root).filter(
    (item) => item && typeof item === "object"
  );
}

// Safely extract pass_id as integer
function getPassId(pass) {
  if (pass == null) return null;
  if (typeof pass === "number") return Number.isInteger(pass) ? pass : null;
  if (typeof pass === "string") {
    const n = Number(pass);
    return Number.isInteger(n) ? n : null;
  }
  const raw = pass.pass_id ?? pass.id ?? pass.gate_pass_id;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function StatusBadge({ status }) {
  const label = String(status || "—").replace(/_/g, " ");
  return <span className={getStatusBadge(status)}>{label}</span>;
}

// Current academic year (e.g. 2026-2027)
function getCurrentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  // Academic year starts April
  if (m >= 4) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

// Convert HH:MM → HH:MM:SS
function toBackendTime(t) {
  if (!t) return null;
  return t.length === 5 ? `${t}:00` : t;
}

// Get default leave type id from balances or types
function getDefaultLeaveTypeId(balances, types) {
  return (
    balances?.[0]?.leave_type_id ||
    types?.[0]?.leave_type_id ||
    types?.[0]?.id ||
    ""
  );
}

// ===================== COMPONENT =====================

export default function HrmsLeaves() {
  const [activeTab, setActiveTab] = useState("LEAVES");
  const [loading, setLoading] = useState(true);

  // Leave states
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  // Leave Apply Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: "",
    from_date: "",
    to_date: "",
    is_half_day: false,
    half_day_session: "NONE",
    reason: "",
    medical_certificate_url: "",
    academic_year: getCurrentAcademicYear(),
  });

  // Gate Pass states
  const [gatePasses, setGatePasses] = useState([]);
  const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);
  const [submittingGatePass, setSubmittingGatePass] = useState(false);
  const [gatePassForm, setGatePassForm] = useState({
    pass_date: new Date().toISOString().split("T")[0],
    out_time: "13:00",
    expected_return_time: "14:30",
    reason: "",
    purpose: "OFFICIAL",
  });

  // ===================== LOADERS =====================

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const [balRes, typesRes, histRes] = await Promise.all([
        getLeaveBalances().catch((err) => {
          console.warn("Balances fetch failed:", err?.response?.data || err.message);
          return null;
        }),
        getLeaveTypes().catch((err) => {
          console.warn("Leave types fetch failed:", err?.response?.data || err.message);
          return null;
        }),
        getLeaveHistory(statusFilter).catch((err) => {
          console.warn("Leave history fetch failed:", err?.response?.data || err.message);
          return null;
        }),
      ]);

      const bal = extractArray(balRes, "balances", "leave_balances", "items");
      const types = extractArray(typesRes, "types", "leave_types", "items");
      const hist = extractArray(histRes, "history", "leaves", "items");

      setBalances(bal);
      setLeaveTypes(types.length > 0 ? types : bal);
      setLeaveHistory(hist);

      if (bal.length > 0) {
        setLeaveForm((prev) =>
          prev.leave_type_id
            ? prev
            : { ...prev, leave_type_id: bal[0].leave_type_id || bal[0].id }
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load leave records");
      setBalances([]);
      setLeaveHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGatePassesData = async () => {
    try {
      setLoading(true);
      const res = await getGatePasses();
      const list = extractArray(res, "gate_passes", "passes", "items");
      setGatePasses(list);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load gate passes");
      setGatePasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "LEAVES") {
      loadLeaveData();
    } else {
      loadGatePassesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter]);

  // ===================== LEAVE HANDLERS =====================

  const handleApplyLeave = async (e) => {
    e.preventDefault();

    if (!leaveForm.leave_type_id) {
      toast.error("Please select a leave type");
      return;
    }
    if (!leaveForm.from_date || !leaveForm.to_date) {
      toast.error("Please select from and to dates");
      return;
    }
    if (!leaveForm.reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    if (new Date(leaveForm.from_date) > new Date(leaveForm.to_date)) {
      toast.error("From date cannot be after To date");
      return;
    }
    if (
      leaveForm.is_half_day &&
      !["MORNING", "AFTERNOON"].includes(leaveForm.half_day_session)
    ) {
      toast.error("Please select a valid half-day session");
      return;
    }

    setSubmittingLeave(true);
    try {
      // Backend-exact payload
      const payload = {
        leave_type_id: Number(leaveForm.leave_type_id),
        from_date: leaveForm.from_date,
        to_date: leaveForm.to_date,
        is_half_day: !!leaveForm.is_half_day,
        half_day_session: leaveForm.is_half_day
          ? leaveForm.half_day_session
          : "NONE",
        reason: leaveForm.reason.trim(),
        academic_year: leaveForm.academic_year,
      };

      // Optional medical cert
      if (leaveForm.medical_certificate_url?.trim()) {
        payload.medical_certificate_url = leaveForm.medical_certificate_url.trim();
      }

      await applyLeave(payload);
      toast.success("Leave application submitted successfully");
      setIsApplyModalOpen(false);

      // Reset
      setLeaveForm({
        leave_type_id: getDefaultLeaveTypeId(balances, leaveTypes),
        from_date: "",
        to_date: "",
        is_half_day: false,
        half_day_session: "NONE",
        reason: "",
        medical_certificate_url: "",
        academic_year: getCurrentAcademicYear(),
      });

      loadLeaveData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply for leave");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleCancelLeave = async (requestId) => {
    if (!requestId) {
      toast.error("Invalid leave request ID");
      return;
    }
    const reason = window.prompt("Reason for cancellation:");
    if (!reason) return;
    try {
      await cancelLeave(requestId, reason);
      toast.success("Leave application cancelled");
      loadLeaveData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel leave");
    }
  };

  // ===================== GATE PASS HANDLERS =====================

  const handleRequestGatePass = async (e) => {
    e.preventDefault();

    if (!gatePassForm.pass_date) {
      toast.error("Please select a date");
      return;
    }
    if (!gatePassForm.out_time || !gatePassForm.expected_return_time) {
      toast.error("Please fill out and expected return time");
      return;
    }
    if (!gatePassForm.reason.trim()) {
      toast.error("Please specify a reason");
      return;
    }

    setSubmittingGatePass(true);
    try {
      // Backend-exact payload:
      // { pass_date, purpose, reason, out_time, expected_return_time }
      const payload = {
        pass_date: gatePassForm.pass_date,
        purpose: gatePassForm.purpose || "OFFICIAL",
        reason: gatePassForm.reason.trim(),
        out_time: toBackendTime(gatePassForm.out_time),
        expected_return_time: toBackendTime(gatePassForm.expected_return_time),
      };

      await requestGatePass(payload);
      toast.success("Gate pass requested successfully");
      setIsGatePassModalOpen(false);
      loadGatePassesData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request gate pass");
    } finally {
      setSubmittingGatePass(false);
    }
  };

  const handleCancelPass = async (pass) => {
    const id = getPassId(pass);
    if (!id) {
      toast.error("Invalid gate pass ID");
      return;
    }
    const reason = window.prompt("Reason for cancellation:");
    if (!reason) return;
    try {
      await cancelGatePass(id, reason);
      toast.success("Gate pass cancelled");
      loadGatePassesData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel gate pass");
    }
  };

  const handleDownloadPass = async (pass) => {
    const id = getPassId(pass);
    if (!id) {
      toast.error("Invalid gate pass ID");
      return;
    }
    try {
      await downloadGatePass(id);
      toast.success(`Gate pass for ${formatDate(pass?.pass_date)} downloaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download gate pass PDF");
    }
  };

  // ===================== SAFE ARRAYS =====================

  const safeBalances = Array.isArray(balances) ? balances : [];
  const safeLeaveHistory = Array.isArray(leaveHistory) ? leaveHistory : [];
  const safeGatePasses = Array.isArray(gatePasses) ? gatePasses : [];
  const safeLeaveTypes = Array.isArray(leaveTypes) ? leaveTypes : [];

  // ===================== RENDER =====================

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Leaves & Gate Passes
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Apply for casual & medical leaves, check quota balances, and
            generate permission gate passes
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "LEAVES" ? (
            <button
              onClick={() => {
                setLeaveForm({
                  leave_type_id: getDefaultLeaveTypeId(balances, leaveTypes),
                  from_date: new Date().toISOString().split("T")[0],
                  to_date: new Date().toISOString().split("T")[0],
                  is_half_day: false,
                  half_day_session: "NONE",
                  reason: "",
                  medical_certificate_url: "",
                  academic_year: getCurrentAcademicYear(),
                });
                setIsApplyModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
            >
              <LuPlus /> Apply Leave
            </button>
          ) : (
            <button
              onClick={() => {
                setGatePassForm({
                  pass_date: new Date().toISOString().split("T")[0],
                  out_time: "13:00",
                  expected_return_time: "14:30",
                  reason: "",
                  purpose: "OFFICIAL",
                });
                setIsGatePassModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
            >
              <LuPlus /> Request Gate Pass
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab("LEAVES")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${activeTab === "LEAVES"
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
        >
          <LuCalendar /> Leave Balances & History
        </button>
        <button
          onClick={() => setActiveTab("GATE_PASSES")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${activeTab === "GATE_PASSES"
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
        >
          <LuTicketCheck /> Gate Passes
        </button>
      </div>

      {/* ============ TAB 1: Leave Management ============ */}
      {activeTab === "LEAVES" && (
        <div className="space-y-6">
          {/* Balance Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm animate-pulse h-32"
                />
              ))}
            </div>
          ) : safeBalances.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-xs text-gray-500">
              No leave balance records available for this year.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {safeBalances.map((b, idx) => (
                <div
                  key={b.balance_id || b.leave_type_id || b.id || idx}
                  className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {b.leave_name || b.leave_type_name || b.name || "-"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                      {b.leave_code || b.leave_type_code || "-"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-extrabold ${Number(b.closing_balance ?? b.remaining_days ?? b.balance ?? 0) < 0
                          ? "text-rose-600"
                          : "text-gray-900"
                        }`}
                    >
                      {b.closing_balance ?? b.remaining_days ?? b.balance ?? 0}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600">
                      Remaining
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      Quota: {b.allocated_days ?? b.annual_quota ?? b.total_allocated ?? "-"}
                    </span>
                    <span>Used: {b.used_days ?? "-"}</span>
                    <span>Pending: {b.pending_days ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History List */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Leave Application History
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  Status:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-semibold p-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING_HOD">Pending HOD</option>
                  <option value="PENDING_PRINCIPAL">Pending Principal</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
                Loading leave applications...
              </div>
            ) : safeLeaveHistory.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-10">
                No leave applications recorded.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[820px]">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                    <tr>
                      <th className="p-3">Leave Type</th>
                      <th className="p-3">Dates</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Days</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {safeLeaveHistory.map((lh, idx) => {
                      const requestId = lh.request_id || lh.id;
                      const statusUpper = String(lh.status || "").toUpperCase();
                      const canCancel =
                        statusUpper === "PENDING_HOD" ||
                        statusUpper === "PENDING_PRINCIPAL";

                      return (
                        <tr key={requestId || idx} className="hover:bg-gray-50">
                          <td className="p-3 font-semibold text-gray-900">
                            {lh.leave_name ||
                              lh.leave_type_name ||
                              lh.leave_code ||
                              lh.leave_type_code ||
                              "-"}
                          </td>
                          <td className="p-3 text-gray-700">
                            {formatDate(lh.from_date || lh.start_date)} -{" "}
                            {formatDate(lh.to_date || lh.end_date)}
                            {!!lh.is_half_day && (
                              <span className="block text-[10px] text-purple-600">
                                Half Day
                                {lh.half_day_session &&
                                  lh.half_day_session !== "NONE" &&
                                  ` (${lh.half_day_session})`}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600 max-w-xs">
                            {lh.reason || "-"}
                          </td>
                          <td className="p-3 font-semibold text-gray-800">
                            {lh.total_days ?? "-"}
                          </td>
                          <td className="p-3">
                            <StatusBadge status={lh.status} />
                          </td>
                          <td className="p-3 text-right">
                            {canCancel ? (
                              <button
                                onClick={() => handleCancelLeave(requestId)}
                                className="text-rose-600 hover:text-rose-800 font-semibold"
                              >
                                Cancel
                              </button>
                            ) : (
                              <span className="text-gray-400 italic">
                                None
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB 2: Gate Passes ============ */}
      {activeTab === "GATE_PASSES" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              Official & Personal Gate Passes
            </h2>
            <p className="text-xs text-gray-500">
              Short permissions to exit campus during instructional duty hours
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
              Loading gate passes...
            </div>
          ) : safeGatePasses.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">
              No gate passes recorded.
            </p>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[820px]">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="p-3">Pass No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Out - Return</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {safeGatePasses.map((pass, idx) => {
                    const passId = getPassId(pass);
                    const purpose = pass.purpose || "—";
                    const statusUpper = String(pass.status || "").toUpperCase();

                    return (
                      <tr key={passId || idx} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs font-bold text-gray-700">
                          {pass.pass_number || "—"}
                        </td>
                        <td className="p-3 font-semibold text-gray-900">
                          {formatDate(pass.pass_date)}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                            {String(purpose).toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-gray-700 font-mono">
                          {formatTime(pass.out_time)} –{" "}
                          {formatTime(pass.expected_return_time)}
                        </td>
                        <td className="p-3 text-gray-600 max-w-xs">
                          {pass.reason || "-"}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={pass.status} />
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {statusUpper === "REQUESTED" && (
                            <button
                              onClick={() => handleCancelPass(pass)}
                              className="text-rose-600 hover:text-rose-800 font-semibold"
                            >
                              Cancel
                            </button>
                          )}
                          {statusUpper === "APPROVED" && (
                            <button
                              onClick={() => handleDownloadPass(pass)}
                              className="text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1"
                            >
                              <LuDownload /> Permit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ MODAL: Apply Leave ============ */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Apply for Leave
                </h3>
                <p className="text-xs text-gray-500">
                  Requires HOD and Principal approval
                </p>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <LuX className="text-lg" />
              </button>
            </div>

            <form
              onSubmit={handleApplyLeave}
              className="p-5 overflow-y-auto space-y-4 grow text-xs"
            >
              <div>
                <label className="font-semibold text-gray-600">
                  Leave Type *
                </label>
                <select
                  required
                  value={leaveForm.leave_type_id}
                  onChange={(e) =>
                    setLeaveForm({
                      ...leaveForm,
                      leave_type_id: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:outline-orange-500"
                >
                  {safeLeaveTypes.length === 0 && (
                    <option value="">No leave types available</option>
                  )}
                  {safeLeaveTypes.map((t, idx) => (
                    <option
                      key={t.leave_type_id || t.id || idx}
                      value={t.leave_type_id || t.id}
                    >
                      {t.leave_name || t.leave_type_name || t.name} (
                      {t.leave_code || t.leave_type_code || t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-600">
                    From Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.from_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, from_date: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl mt-1 focus:outline-orange-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-600">
                    To Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.to_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, to_date: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-xl mt-1 focus:outline-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="half_day"
                  checked={leaveForm.is_half_day}
                  onChange={(e) =>
                    setLeaveForm({
                      ...leaveForm,
                      is_half_day: e.target.checked,
                      half_day_session: e.target.checked
                        ? leaveForm.half_day_session === "NONE"
                          ? "MORNING"
                          : leaveForm.half_day_session
                        : "NONE",
                    })
                  }
                  className="rounded text-orange-600"
                />
                <label
                  htmlFor="half_day"
                  className="font-semibold text-gray-700 cursor-pointer"
                >
                  Is Half Day
                </label>
              </div>

              {leaveForm.is_half_day && (
                <div>
                  <label className="font-semibold text-gray-600">
                    Half Day Session
                  </label>
                  <select
                    value={leaveForm.half_day_session}
                    onChange={(e) =>
                      setLeaveForm({
                        ...leaveForm,
                        half_day_session: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:outline-orange-500"
                  >
                    <option value="MORNING">Morning (First Half)</option>
                    <option value="AFTERNOON">Afternoon (Second Half)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-600">Reason *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Attending family function, medical checkup..."
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, reason: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-xl mt-1 focus:outline-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-600">
                  Medical Certificate URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://... (medical certificate etc.)"
                  value={leaveForm.medical_certificate_url}
                  onChange={(e) =>
                    setLeaveForm({
                      ...leaveForm,
                      medical_certificate_url: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border rounded-xl mt-1 focus:outline-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-600">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={leaveForm.academic_year}
                  onChange={(e) =>
                    setLeaveForm({
                      ...leaveForm,
                      academic_year: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border rounded-xl mt-1 focus:outline-orange-500 bg-gray-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold disabled:opacity-50"
                >
                  {submittingLeave ? "Submitting..." : "Apply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL: Request Gate Pass ============ */}
      {isGatePassModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Request Gate Pass
                </h3>
                <p className="text-xs text-gray-500">
                  Permission to leave campus during duty hours
                </p>
              </div>
              <button
                onClick={() => setIsGatePassModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <LuX className="text-lg" />
              </button>
            </div>

            <form
              onSubmit={handleRequestGatePass}
              className="p-5 overflow-y-auto space-y-4 grow text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-600">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={gatePassForm.pass_date}
                    onChange={(e) =>
                      setGatePassForm({
                        ...gatePassForm,
                        pass_date: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-xl mt-1 focus:outline-orange-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-600">
                    Out Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={gatePassForm.out_time}
                    onChange={(e) =>
                      setGatePassForm({
                        ...gatePassForm,
                        out_time: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-xl mt-1 focus:outline-orange-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-600">
                    Expected Return *
                  </label>
                  <input
                    type="time"
                    required
                    value={gatePassForm.expected_return_time}
                    onChange={(e) =>
                      setGatePassForm({
                        ...gatePassForm,
                        expected_return_time: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-xl mt-1 focus:outline-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-600">
                  Purpose *
                </label>
                <select
                  value={gatePassForm.purpose}
                  onChange={(e) =>
                    setGatePassForm({
                      ...gatePassForm,
                      purpose: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border rounded-xl mt-1 bg-white focus:outline-orange-500"
                >
                  <option value="OFFICIAL">OFFICIAL</option>
                  <option value="PERSONAL">PERSONAL</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-600">Reason *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Doctor appointment, urgent bank work, official meeting..."
                  value={gatePassForm.reason}
                  onChange={(e) =>
                    setGatePassForm({
                      ...gatePassForm,
                      reason: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border rounded-xl mt-1 focus:outline-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsGatePassModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGatePass}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold disabled:opacity-50"
                >
                  {submittingGatePass ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}