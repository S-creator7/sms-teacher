import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  LuBox,
  LuLogOut,
  LuArrowRightLeft,
  LuX,
  LuShieldAlert,
  LuCircleCheck,
  LuRefreshCw
} from "react-icons/lu";
import {
  getAssets,
  getResignationStatus,
  submitResignation,
  withdrawResignation,
  getTransferHistory
} from "../../Utility/hrmsApi";
import { getStatusBadge, formatDate } from "../../Utility/hrmsUtils";

// ---- Helpers ---------------------------------------------------------------

const DASH = "—";

const toArray = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    const nested =
      raw.transfers ??
      raw.history ??
      raw.items ??
      raw.assets ??
      raw.records ??
      raw.data;
    if (Array.isArray(nested)) return nested;
    return Object.values(raw);
  }
  return [];
};

const orDash = (v) => {
  if (v === null || v === undefined) return DASH;
  if (typeof v === "string" && v.trim() === "") return DASH;
  return v;
};

const safeDate = (v) => {
  if (!v) return DASH;
  const formatted = formatDate(v);
  return formatted || DASH;
};

const prettyCase = (v) =>
  String(v)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const CONDITION_STYLES = {
  NEW: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  GOOD: "bg-green-50 text-green-700 border border-green-200",
  FAIR: "bg-amber-50 text-amber-700 border border-amber-200",
  WORN: "bg-amber-50 text-amber-700 border border-amber-200",
  DAMAGED: "bg-rose-50 text-rose-700 border border-rose-200",
  LOST: "bg-rose-100 text-rose-800 border border-rose-300",
  RETURNED: "bg-slate-100 text-slate-700 border border-slate-200"
};

const conditionBadgeClass = (value) =>
  CONDITION_STYLES[String(value || "").toUpperCase()] ||
  "bg-gray-100 text-gray-700 border border-gray-200";

const ASSET_STATUS_STYLES = {
  ISSUED: "bg-blue-50 text-blue-700 border border-blue-200",
  RETURNED: "bg-slate-100 text-slate-700 border border-slate-200",
  LOST: "bg-rose-50 text-rose-700 border border-rose-200",
  DAMAGED: "bg-amber-50 text-amber-700 border border-amber-200"
};

const assetStatusBadgeClass = (value) =>
  ASSET_STATUS_STYLES[String(value || "").toUpperCase()] ||
  "bg-gray-100 text-gray-600 border border-gray-200";

const todayISO = () => new Date().toISOString().split("T")[0];

// Inline refresh overlay — shown on top of existing content during a re-fetch.
const RefreshOverlay = ({ show }) => {
  if (!show) return null;
  return (
    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
      <div className="flex items-center gap-2 text-xs font-semibold text-orange-600">
        <LuRefreshCw className="w-4 h-4 animate-spin" />
        Refreshing...
      </div>
    </div>
  );
};

// ---- Component -------------------------------------------------------------

export default function HrmsAssets() {
  const [activeTab, setActiveTab] = useState("ASSETS");

  // Per-tab loading flags — one tab loading never blocks the others.
  const [loadingTab, setLoadingTab] = useState(null);

  // Cache flags — once a tab loads, we don't refetch on every switch.
  const [loadedOnce, setLoadedOnce] = useState({
    ASSETS: false,
    RESIGNATION: false,
    TRANSFERS: false
  });

  // Data
  const [assets, setAssets] = useState([]);
  const [resignation, setResignation] = useState(null);
  const [transfers, setTransfers] = useState([]);

  // Modal / form
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resignationForm, setResignationForm] = useState({
    reason: "",
    resignation_date: "",
    requested_relieving_date: "",
    requested_last_date: ""
  });

  // ---- Fetchers ----------------------------------------------------------

  const fetchAssetsData = async () => {
    try {
      setLoadingTab("ASSETS");
      const res = await getAssets();
      const raw = res?.resources?.data ?? res?.data ?? [];
      setAssets(toArray(raw));
    } catch (err) {
      console.error("Failed to load assets:", err);
      toast.error(err.response?.data?.message || "Failed to load issued assets");
      setAssets([]);
    } finally {
      setLoadingTab(null);
      setLoadedOnce((prev) => ({ ...prev, ASSETS: true }));
    }
  };

  const fetchResignationData = async () => {
    try {
      setLoadingTab("RESIGNATION");
      const res = await getResignationStatus();
      const raw = res?.resources?.data ?? res?.data ?? null;
      setResignation(raw && Object.keys(raw).length > 0 ? raw : null);
    } catch (err) {
      console.error(err);
      setResignation(null);
    } finally {
      setLoadingTab(null);
      setLoadedOnce((prev) => ({ ...prev, RESIGNATION: true }));
    }
  };

  const fetchTransfersData = async () => {
    try {
      setLoadingTab("TRANSFERS");
      const res = await getTransferHistory();
      const raw = res?.resources?.data ?? res?.data ?? [];
      setTransfers(toArray(raw));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load transfer history");
      setTransfers([]);
    } finally {
      setLoadingTab(null);
      setLoadedOnce((prev) => ({ ...prev, TRANSFERS: true }));
    }
  };

  useEffect(() => {
    fetchAssetsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Tab switching -----------------------------------------------------

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // First-time load only. Refresh button forces a re-fetch.
    if (loadedOnce[tab]) return;
    if (tab === "ASSETS") fetchAssetsData();
    if (tab === "RESIGNATION") fetchResignationData();
    if (tab === "TRANSFERS") fetchTransfersData();
  };

  // Manual refresh for the currently active tab
  const handleRefresh = () => {
    if (activeTab === "ASSETS") fetchAssetsData();
    if (activeTab === "RESIGNATION") fetchResignationData();
    if (activeTab === "TRANSFERS") fetchTransfersData();
  };

  const isCurrentTabLoading = loadingTab === activeTab;

  // ---- Resignation handlers ---------------------------------------------

  const openResignationModal = () => {
    setResignationForm({
      reason: "",
      resignation_date: todayISO(),
      requested_relieving_date: "",
      requested_last_date: ""
    });
    setIsSubmitModalOpen(true);
  };

  const closeResignationModal = () => {
    if (submitting) return;
    setIsSubmitModalOpen(false);
  };

  const handleSubmitResignation = async (e) => {
    e.preventDefault();

    if (
      !resignationForm.reason.trim() ||
      !resignationForm.resignation_date ||
      !resignationForm.requested_last_date
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (resignationForm.requested_last_date < resignationForm.resignation_date) {
      toast.error("Last working day cannot be before the resignation date");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reason: resignationForm.reason.trim(),
        resignation_date: resignationForm.resignation_date,
        requested_relieving_date: resignationForm.requested_last_date,
        requested_last_date: resignationForm.requested_last_date
      };

      await submitResignation(payload);
      toast.success("Resignation application submitted");
      setIsSubmitModalOpen(false);
      fetchResignationData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit resignation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawResignation = async () => {
    const reason = window.prompt("Reason for withdrawal:");
    if (!reason) return;
    try {
      await withdrawResignation({ reason });
      toast.success("Resignation withdrawn successfully");
      fetchResignationData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to withdraw resignation");
    }
  };

  const WITHDRAWABLE = ["SUBMITTED", "HOD_RECOMMENDED", "PENDING"];
  const canWithdraw =
    resignation && WITHDRAWABLE.includes(resignation.status?.toUpperCase());

  // Column visibility — hide empty columns
  const showExpectedReturn = assets.some(
    (a) => a.expected_return_date != null && a.expected_return_date !== ""
  );
  const showReturnedAt = assets.some(
    (a) => a.returned_at != null && a.returned_at !== ""
  );

  // ---- Render ------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Assets & Exit Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track institutional custody items, resignation clearance status, and department transfers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isCurrentTabLoading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 shadow-sm transition disabled:opacity-50"
            title="Refresh"
          >
            <LuRefreshCw
              className={`w-4 h-4 ${isCurrentTabLoading ? "animate-spin text-orange-500" : ""
                }`}
            />
          </button>

          {activeTab === "RESIGNATION" && !resignation && (
            <button
              onClick={openResignationModal}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <LuLogOut /> Submit Resignation
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => handleTabChange("ASSETS")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${activeTab === "ASSETS"
            ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
        >
          <LuBox /> Issued Assets ({assets.length})
        </button>
        <button
          onClick={() => handleTabChange("RESIGNATION")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${activeTab === "RESIGNATION"
            ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
        >
          <LuLogOut /> Resignation & Exit
        </button>
        <button
          onClick={() => handleTabChange("TRANSFERS")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${activeTab === "TRANSFERS"
            ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
        >
          <LuArrowRightLeft /> Transfer History
        </button>
      </div>

      {/* ================= TAB 1: Assets ================= */}
      {activeTab === "ASSETS" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Custody Equipment & Issued Assets
              </h2>
              <p className="text-xs text-gray-500">
                Official hardware, laboratory equipment, keys, and devices issued in your name
              </p>
            </div>
            <span className="text-xs text-gray-400">
              Total {assets.length} items
            </span>
          </div>

          {/* First-time load → full spinner; refresh → overlay on top of existing content */}
          {loadingTab === "ASSETS" && !loadedOnce.ASSETS ? (
            <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
              Loading assets...
            </div>
          ) : assets.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">
              No assets issued to your custody.
            </p>
          ) : (
            <div className="relative border border-gray-200 rounded-xl overflow-hidden min-h-[200px]">
              <RefreshOverlay
                show={loadingTab === "ASSETS" && loadedOnce.ASSETS}
              />
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="p-3">Asset Code & Item</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Serial / Model No</th>
                    <th className="p-3">Issued Date</th>
                    {showExpectedReturn && <th className="p-3">Expected Return</th>}
                    {showReturnedAt && <th className="p-3">Returned At</th>}
                    <th className="p-3">Condition</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets.map((asset, idx) => {
                    const rowKey = asset.issue_id ?? asset.asset_id ?? idx;
                    const condition = asset.condition_on_issue;
                    const status = asset.status;

                    return (
                      <tr key={rowKey} className="hover:bg-gray-50">
                        <td className="p-3">
                          <span className="font-bold text-gray-900 block">
                            {orDash(asset.asset_name)}
                          </span>
                          <span className="text-[10px] text-orange-600 font-semibold">
                            {orDash(asset.asset_tag)}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {asset.asset_type ? prettyCase(asset.asset_type) : DASH}
                        </td>
                        <td className="p-3 text-gray-700 font-mono text-[11px]">
                          {orDash(asset.serial_number)}
                        </td>
                        <td className="p-3 text-gray-600">
                          {safeDate(asset.issued_at)}
                        </td>
                        {showExpectedReturn && (
                          <td className="p-3 text-gray-600">
                            {safeDate(asset.expected_return_date)}
                          </td>
                        )}
                        {showReturnedAt && (
                          <td className="p-3 text-gray-600">
                            {safeDate(asset.returned_at)}
                          </td>
                        )}
                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-start">
                            {condition && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${conditionBadgeClass(
                                  condition
                                )}`}
                              >
                                {String(condition)
                                  .replace(/_/g, " ")
                                  .toUpperCase()}
                              </span>
                            )}
                            {status && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${assetStatusBadgeClass(
                                  status
                                )}`}
                              >
                                {String(status).replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-gray-500 max-w-xs">
                          {orDash(asset.remarks)}
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

      {/* ================= TAB 2: Resignation ================= */}
      {activeTab === "RESIGNATION" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="pb-3 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              Resignation & Handover Tracking
            </h2>
            <p className="text-xs text-gray-500">
              Submit separation notices, track HOD & Principal sign-offs, and manage withdrawal
            </p>
          </div>

          {loadingTab === "RESIGNATION" && !loadedOnce.RESIGNATION ? (
            <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
              Loading resignation status...
            </div>
          ) : resignation ? (
            <div className="relative space-y-6">
              <RefreshOverlay
                show={loadingTab === "RESIGNATION" && loadedOnce.RESIGNATION}
              />

              <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center text-xl">
                    <LuLogOut />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-base">
                        Active Resignation Request
                      </h3>
                      {resignation.status && (
                        <span className={getStatusBadge(resignation.status)}>
                          {String(resignation.status).replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Submitted on:{" "}
                      {safeDate(
                        resignation.created_at ||
                        resignation.submitted_at ||
                        resignation.submission_date ||
                        resignation.resignation_date ||
                        resignation.createdAt
                      )}{" "}
                      &bull; Requested Last Day:{" "}
                      <strong className="text-gray-900">
                        {safeDate(
                          resignation.requested_last_date ||
                          resignation.requested_relieving_date ||
                          resignation.requested_last_working_day ||
                          resignation.last_working_day
                        )}
                      </strong>
                    </p>
                  </div>
                </div>

                {canWithdraw && (
                  <button
                    onClick={handleWithdrawResignation}
                    className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold text-xs transition"
                  >
                    Withdraw Resignation
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {resignation.reason && (
                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                    <p className="font-bold text-gray-800">Primary Reason</p>
                    <p className="text-gray-700">{resignation.reason}</p>
                  </div>
                )}
                {resignation.remarks && (
                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                    <p className="font-bold text-gray-800">Handover Remarks</p>
                    <p className="text-gray-700">{resignation.remarks}</p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <LuShieldAlert /> Notice Period & Asset Clearance Notice
                </p>
                <p>
                  Please ensure all assigned equipment, library books, grade reports, and
                  classroom keys are returned to their respective departmental heads prior
                  to your last working day.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400 text-2xl">
                <LuCircleCheck />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                No Active Separation Application
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                You can apply for formal resignation using the button below.
              </p>
              <button
                onClick={openResignationModal}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow"
              >
                Apply for Resignation
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: Transfers ================= */}
      {activeTab === "TRANSFERS" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              Campus & Department Transfer History
            </h2>
            <p className="text-xs text-gray-500">
              Official log of campus movements, inter-school transfers and designation adjustments
            </p>
          </div>

          {loadingTab === "TRANSFERS" && !loadedOnce.TRANSFERS ? (
            <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
              Loading transfer history...
            </div>
          ) : !Array.isArray(transfers) || transfers.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">
              No transfer records found.
            </p>
          ) : (
            <div className="relative border border-gray-200 rounded-xl overflow-hidden min-h-[200px]">
              <RefreshOverlay
                show={loadingTab === "TRANSFERS" && loadedOnce.TRANSFERS}
              />
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="p-3">Effective Date</th>
                    <th className="p-3">From Campus / Dept</th>
                    <th className="p-3">To Campus / Dept</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Transfer Order / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transfers.map((t, idx) => (
                    <tr
                      key={t.id ?? t.transfer_id ?? idx}
                      className="hover:bg-gray-50"
                    >
                      <td className="p-3 font-semibold text-gray-900">
                        {safeDate(t.effective_date || t.transfer_date)}
                      </td>
                      <td className="p-3 text-gray-600">
                        {orDash(t.from_school_name)} &bull;{" "}
                        {orDash(t.from_department_name)}
                      </td>
                      <td className="p-3 font-semibold text-orange-600">
                        {orDash(t.to_school_name)} &bull;{" "}
                        {orDash(t.to_department_name)}
                      </td>
                      <td className="p-3 text-gray-700">
                        {orDash(t.from_designation_id)} →{" "}
                        {orDash(t.to_designation_id)}
                      </td>
                      <td className="p-3 text-gray-500 max-w-xs">
                        {orDash(t.transfer_order_ref || t.transfer_reason)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: Submit Resignation ================= */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Resignation Application
                </h3>
                <p className="text-xs text-gray-500">
                  Formal separation notice to Management & HR
                </p>
              </div>
              <button
                onClick={closeResignationModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <LuX className="text-lg" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitResignation}
              className="p-5 overflow-y-auto space-y-4 grow text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-600">
                    Resignation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={resignationForm.resignation_date}
                    onChange={(e) =>
                      setResignationForm({
                        ...resignationForm,
                        resignation_date: e.target.value
                      })
                    }
                    className="w-full p-2.5 border rounded-xl mt-1 focus:outline-orange-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-600">
                    Requested Last Working Day
                  </label>
                  <input
                    type="date"
                    required
                    min={resignationForm.resignation_date || undefined}
                    value={resignationForm.requested_last_date}
                    onChange={(e) =>
                      setResignationForm({
                        ...resignationForm,
                        requested_last_date: e.target.value,
                        requested_relieving_date: e.target.value
                      })
                    }
                    className="w-full p-2.5 border rounded-xl mt-1 focus:outline-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-600">
                  Primary Reason for Leaving
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="State reason (e.g. Relocation, Higher education, Family reasons...)"
                  value={resignationForm.reason}
                  onChange={(e) =>
                    setResignationForm({
                      ...resignationForm,
                      reason: e.target.value
                    })
                  }
                  className="w-full p-2.5 border rounded-xl mt-1 focus:outline-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={closeResignationModal}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}