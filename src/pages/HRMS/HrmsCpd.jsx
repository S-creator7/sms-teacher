import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  LuGraduationCap,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuExternalLink,
  LuLock,
  LuRefreshCw,
  LuAward,
  LuX,
  LuTriangleAlert,
} from "react-icons/lu";
import {
  getCpdProgress,
  getCpdCategories,
  submitCpd,
  editCpd,
  deleteCpd,
} from "../../Utility/hrmsApi";
import { getStatusBadge, formatDate } from "../../Utility/hrmsUtils";

// ---------- Backend enums ----------
const CPD_MODES = [
  { value: "ONLINE", label: "Online" },
  { value: "OFFLINE", label: "Offline / In-Person" },
  { value: "HYBRID", label: "Hybrid" },
];

// Current academic year (April → March)
function getCurrentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 4) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

// Robust array extraction from any backend shape
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
      (v) => v && typeof v === "object"
    );
    if (vals.length > 0) return vals;
  }

  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key];
    if (root[key] && typeof root[key] === "object") {
      const vals = Object.values(root[key]).filter(
        (v) => v && typeof v === "object"
      );
      if (vals.length > 0) return vals;
    }
  }

  // Numeric-keyed object fallback
  const vals = Object.values(root).filter(
    (v) => v && typeof v === "object" && !Array.isArray(v)
  );
  return vals;
}

// Extract object (for progress)
function extractObject(res) {
  if (!res) return null;
  const root = res?.resources?.data ?? res?.data ?? res;
  if (!root || typeof root !== "object") return null;
  if (Array.isArray(root)) return null;
  if (Object.keys(root).length === 0) return null;
  return root;
}

export default function HrmsCpd() {
  const currentAcademicYear = getCurrentAcademicYear();
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [loading, setLoading] = useState(true);

  // Data states
  const [progressData, setProgressData] = useState(null);
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);

  // Modal states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Backend-exact form fields
  const [form, setForm] = useState({
    category_id: "",
    program_title: "",
    organizing_body: "",
    start_date: "",
    end_date: "",
    hours_completed: 6,
    mode: "ONLINE",
    certificate_url: "",
    learning_outcomes: "",
    academic_year: currentAcademicYear,
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null,
    title: "",
    isDeleting: false,
  });

  // ===================== LOAD =====================
  const loadCpdData = async () => {
    try {
      setLoading(true);
      const [progRes, catRes] = await Promise.all([
        getCpdProgress(academicYear).catch((err) => {
          console.warn("CPD progress failed:", err?.response?.data || err.message);
          return null;
        }),
        getCpdCategories().catch((err) => {
          console.warn("CPD categories failed:", err?.response?.data || err.message);
          return null;
        }),
      ]);

  

      // Extract progress object
      const progressRaw = extractObject(progRes);
      setProgressData(progressRaw);

      // Extract records from any possible location
      let recordsArray = [];

      if (progressRaw) {
        // Try known keys first
        if (Array.isArray(progressRaw.records)) {
          recordsArray = progressRaw.records;
        } else if (Array.isArray(progressRaw.cpd_records)) {
          recordsArray = progressRaw.cpd_records;
        } else if (Array.isArray(progressRaw.training_records)) {
          recordsArray = progressRaw.training_records;
        } else if (Array.isArray(progressRaw.items)) {
          recordsArray = progressRaw.items;
        } else if (Array.isArray(progressRaw.submissions)) {
          recordsArray = progressRaw.submissions;
        } else if (Array.isArray(progressRaw.data)) {
          recordsArray = progressRaw.data;
        } else {
          // Last resort: numeric-keyed object — filter only CPD-like items
          const vals = Object.values(progressRaw).filter(
            (v) =>
              v &&
              typeof v === "object" &&
              !Array.isArray(v) &&
              (v.cpd_record_id !== undefined ||
                v.program_title !== undefined ||
                v.activity_title !== undefined ||
                v.organizing_body !== undefined)
          );
          recordsArray = vals;
        }
      }

      setRecords(recordsArray);

      // Extract categories
      const catArray = extractArray(catRes, "categories", "items", "cpd_categories");
      setCategories(catArray);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to load CPD progress"
      );
      setRecords([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCpdData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  // ===================== MODAL OPEN =====================
  const openAddModal = () => {
    setEditingRecord(null);
    setForm({
      category_id: categories[0]?.category_id || categories[0]?.id || "",
      program_title: "",
      organizing_body: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      hours_completed: 6,
      mode: "ONLINE",
      certificate_url: "",
      learning_outcomes: "",
      academic_year: academicYear,
    });
    setIsSubmitModalOpen(true);
  };

  const openEditModal = (rec) => {
    const status = String(
      rec.approval_status || rec.status || ""
    ).toUpperCase();
    if (status !== "SUBMITTED") {
      toast.error("Locked: Only records in 'SUBMITTED' status can be modified.");
      return;
    }

    setEditingRecord(rec);
    setForm({
      category_id: rec.category_id || "",
      program_title: rec.program_title || rec.title || "",
      organizing_body: rec.organizing_body || rec.organizer || "",
      start_date: rec.start_date || rec.training_date?.split("T")[0] || "",
      end_date: rec.end_date || rec.training_date?.split("T")[0] || "",
      hours_completed:
        rec.hours_completed || rec.duration_hours || rec.hours || 0,
      mode: rec.mode || "ONLINE",
      certificate_url: rec.certificate_url || "",
      learning_outcomes: rec.learning_outcomes || "",
      academic_year: rec.academic_year || academicYear,
    });
    setIsSubmitModalOpen(true);
  };

  // ===================== SUBMIT =====================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.program_title.trim()) {
      toast.error("Please enter the workshop title");
      return;
    }
    if (!form.organizing_body.trim()) {
      toast.error("Please enter the organizing body");
      return;
    }
    if (!form.hours_completed || Number(form.hours_completed) <= 0) {
      toast.error("Hours must be greater than 0");
      return;
    }
    if (!form.start_date) {
      toast.error("Please select a start date");
      return;
    }

    setSubmitting(true);
    try {
      // ✅ Backend-exact payload (includes activity_* mirror fields)
      const payload = {
        category_id: Number(form.category_id) || null,
        program_title: form.program_title.trim(),
        organizing_body: form.organizing_body.trim(),
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        hours_completed: Number(form.hours_completed),
        mode: form.mode || "ONLINE",
        certificate_url: form.certificate_url?.trim() || null,
        learning_outcomes: form.learning_outcomes?.trim() || null,

        // Mirror fields — backend expects these
        activity_title: form.program_title.trim(),
        activity_date: form.start_date,
        hours_claimed: Number(form.hours_completed),

        academic_year: form.academic_year || academicYear,
      };

      if (editingRecord) {
        const id = editingRecord.cpd_record_id || editingRecord.id;
        await editCpd(id, payload);
        toast.success("CPD record updated successfully");
      } else {
        await submitCpd(payload);
        toast.success("CPD workshop logged successfully");
      }

      setIsSubmitModalOpen(false);
      await loadCpdData(); // ✅ wait for reload before closing
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to submit CPD record"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ===================== DELETE =====================
  const handleDelete = async () => {
    setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }));
    try {
      await deleteCpd(deleteConfirm.id);
      toast.success("CPD record deleted");
      setDeleteConfirm({
        isOpen: false,
        id: null,
        title: "",
        isDeleting: false,
      });
      await loadCpdData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record");
      setDeleteConfirm((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // ===================== DERIVED =====================
  const required = Number(
  progressData?.target_hours ?? progressData?.required_hours ?? 50
);

const completed = Number(
  progressData?.approved_hours ?? progressData?.completed_hours ?? 0
);
  const pending =
    progressData?.pending_approval_hours ??
    progressData?.pending_hours ??
    0;
  const percentage = Math.min(
    100,
    progressData?.completion_percentage ??
      (required > 0 ? Math.round((completed / required) * 100) : 0)
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ============ Top Header ============ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Continuous Professional Development (CPD)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track CBSE / NEP 2020 mandatory 50-hour annual training hours and
            pedagogical workshops
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"
          >
            <option value="2026-2027">AY 2026-2027</option>
            <option value="2025-2026">AY 2025-2026</option>
            <option value="2024-2025">AY 2024-2025</option>
          </select>

          <button
            onClick={() => loadCpdData()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 shadow-sm transition"
            title="Refresh"
          >
            <LuRefreshCw
              className={`w-4 h-4 ${
                loading ? "animate-spin text-orange-500" : ""
              }`}
            />
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition"
          >
            <LuPlus className="w-4 h-4" /> Log Workshop
          </button>
        </div>
      </div>

      {/* ============ Annual Progress Card ============ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <LuAward className="w-5 h-5 text-amber-600" />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                NEP 2020 Annual Progress
              </h3>
              <p className="text-xs text-gray-500">
                Target: {required} Hours of certified development
              </p>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900">
              {completed}
            </span>
            <span className="text-xs font-bold text-gray-400">
              / {required} hrs ({percentage}%)
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 font-semibold">
            <span>0 hrs</span>
            <span>
              Target: {required} hrs ({academicYear})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">
              Approved Credits
            </span>
            <p className="text-2xl font-black text-emerald-950 mt-1">
              {completed} hrs
            </p>
            <span className="text-[10px] text-emerald-700">
              Verified by Academic Dean
            </span>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <span className="text-[11px] font-bold text-amber-800 uppercase">
              Pending Review
            </span>
            <p className="text-2xl font-black text-amber-950 mt-1">
              {pending} hrs
            </p>
            <span className="text-[10px] text-amber-700">
              Awaiting certificate audit
            </span>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-[11px] font-bold text-blue-800 uppercase">
              Balance Needed
            </span>
            <p className="text-2xl font-black text-blue-950 mt-1">
              {Math.max(0, required - completed)} hrs
            </p>
            <span className="text-[10px] text-blue-700">
              To achieve 100% completion
            </span>
          </div>
        </div>
      </div>

      {/* ============ Records Table ============ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Training & Workshop Submissions
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Certificates and duration records submitted for accreditation
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {records.length} {records.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400 animate-pulse">
            Loading training history...
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            No CPD workshops logged for academic year {academicYear}. Click "+ Log
            Workshop" to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.map((rec, idx) => {
              const recId = rec.cpd_record_id || rec.id || idx;
              const status = String(
                rec.approval_status || rec.status || "SUBMITTED"
              ).toUpperCase();
              const isEditable = status === "SUBMITTED";
              const title =
                rec.program_title || rec.activity_title || rec.title || "-";
              const organizer =
                rec.organizing_body || rec.organizer || "-";
              const hours =
                rec.hours_completed ??
                rec.hours_claimed ??
                rec.duration_hours ??
                rec.hours ??
                0;
              const dateVal =
                rec.start_date || rec.activity_date || rec.training_date;

              return (
                <div
                  key={recId}
                  className="p-5 rounded-2xl border border-gray-200 bg-gray-50/40 space-y-3 relative hover:border-orange-200 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate">
                        {title}
                      </h4>
                      <p className="text-xs text-orange-600 font-semibold mt-0.5 truncate">
                        {organizer} &bull; {rec.mode || "ONLINE"}
                      </p>
                    </div>
                    <span className={getStatusBadge(status)}>{status}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Date:</span>
                      <p className="font-semibold text-gray-800">
                        {formatDate(dateVal)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <p className="font-bold text-gray-900">{hours} Hours</p>
                    </div>
                    {rec.credits_awarded !== undefined && (
                      <div className="col-span-2">
                        <span className="text-gray-400">
                          Credits Awarded:
                        </span>
                        <p className="font-bold text-emerald-700">
                          {rec.credits_awarded} Credits
                        </p>
                      </div>
                    )}
                  </div>

                  {rec.learning_outcomes && (
                    <p className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-100">
                      <strong>Outcomes:</strong> {rec.learning_outcomes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    {rec.certificate_url &&
                    rec.certificate_url !== "string" &&
                    !rec.certificate_url.startsWith("Unknown Type") ? (
                      <a
                        href={rec.certificate_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <LuExternalLink className="w-3.5 h-3.5" /> View
                        Certificate
                      </a>
                    ) : (
                      <span className="text-gray-400">
                        No certificate attached
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {isEditable ? (
                        <>
                          <button
                            onClick={() => openEditModal(rec)}
                            className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-orange-600 transition"
                            title="Edit Record"
                          >
                            <LuPencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                id: recId,
                                title: title,
                                isDeleting: false,
                              })
                            }
                            className="p-1.5 hover:bg-white rounded-lg text-gray-600 hover:text-rose-600 transition"
                            title="Delete Record"
                          >
                            <LuTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 px-2 py-0.5 rounded bg-gray-100"
                          title="Locked once Approved or Rejected by Admin"
                        >
                          <LuLock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ MODAL: SUBMIT / EDIT CPD ============ */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingRecord
                  ? "Edit Workshop Record"
                  : "Log New CPD Workshop"}
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700">
                  CPD Category *
                </label>
                <select
                  required
                  value={form.category_id}
                  onChange={(e) =>
                    setForm({ ...form, category_id: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => {
                    const cid = c.category_id || c.id || c.value;
                    const cname = c.name || c.label || c.category_name;
                    return (
                      <option key={cid} value={cid}>
                        {cname}
                      </option>
                    );
                  })}
              
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700">
                  Workshop / Training Title *
                </label>
                <input
                  required
                  type="text"
                  value={form.program_title}
                  onChange={(e) =>
                    setForm({ ...form, program_title: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  placeholder="e.g. CBSE NEP 2020 Pedagogical Leadership"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700">
                  Organizing Body / Institute *
                </label>
                <input
                  required
                  type="text"
                  value={form.organizing_body}
                  onChange={(e) =>
                    setForm({ ...form, organizing_body: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  placeholder="e.g. CBSE Centre of Excellence / IISc"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">
                    Start Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({ ...form, start_date: e.target.value })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm({ ...form, end_date: e.target.value })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">
                    Duration (Hours) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.hours_completed}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hours_completed: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Mode *</label>
                  <select
                    required
                    value={form.mode}
                    onChange={(e) =>
                      setForm({ ...form, mode: e.target.value })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  >
                    {CPD_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700">
                  Certificate URL / Link
                </label>
                <input
                  type="url"
                  value={form.certificate_url}
                  onChange={(e) =>
                    setForm({ ...form, certificate_url: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700">
                  Key Learning Outcomes & Classroom Integration
                </label>
                <textarea
                  rows={3}
                  value={form.learning_outcomes}
                  onChange={(e) =>
                    setForm({ ...form, learning_outcomes: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  placeholder="Summarize key methodologies and student impacts..."
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={form.academic_year}
                  onChange={(e) =>
                    setForm({ ...form, academic_year: e.target.value })
                  }
                  className="w-full mt-1 p-2 border border-gray-200 rounded-xl bg-gray-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingRecord
                    ? "Update Record"
                    : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRM MODAL ============ */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <LuTriangleAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Delete CPD Record
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to remove{" "}
                <span className="font-bold text-gray-700">
                  "{deleteConfirm.title}"
                </span>
                ?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() =>
                  setDeleteConfirm({
                    isOpen: false,
                    id: null,
                    title: "",
                    isDeleting: false,
                  })
                }
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm.isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {deleteConfirm.isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}