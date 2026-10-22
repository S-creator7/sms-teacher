import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  LuAward,
  LuCalendar,
  LuClock,
  LuLock,
  LuPencil,
  LuX,
  LuRefreshCw,
  LuStar,
  LuUserCheck
} from "react-icons/lu";
import {
  getAppraisalCycles,
  getAppraisalDetails,
  submitSelfAppraisal
} from "../../Utility/hrmsApi";
import { getStatusBadge, formatDate } from "../../Utility/hrmsUtils";

// ---- Config ----------------------------------------------------------------
// Backend stores 4 fixed numeric scores. These are UI display labels for them.
// The label text is a product decision — change here, applies everywhere.
const KRA_LABELS = {
  self_score_academic: "Academic Outcomes",
  self_score_pedagogy: "Pedagogy & Innovation",
  self_score_cocurricular: "Co-curricular & Pastoral Care",
  self_score_cpd: "Continuous Professional Development"
};

// Fixed order matches KRA_LABELS. kra_id is the client-side index for form state.
const KRA_FIELDS = [
  { kra_id: 1, api_field: "self_score_academic" },
  { kra_id: 2, api_field: "self_score_pedagogy" },
  { kra_id: 3, api_field: "self_score_cocurricular" },
  { kra_id: 4, api_field: "self_score_cpd" }
];

// Slider is 1.0 – 5.0. API expects 0 – 100.
const SLIDER_MIN = 1;
const SLIDER_MAX = 5;
const SLIDER_STEP = 0.5;
const UI_TO_API_SCALE = 20;
const API_TO_UI_SCALE = 1 / UI_TO_API_SCALE;

const toApiScore = (v) => Math.round((Number(v) || 0) * UI_TO_API_SCALE);
const toUiScore = (v) => {
  const n = Number(v);           // handles "100.00" strings
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * API_TO_UI_SCALE * 2) / 2;
};

const toArray = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") return Object.values(raw);
  return [];
};

const normalizeCycle = (c) => ({
  id: c.cycle_id ?? c.id,
  title: c.cycle_name ?? c.title,
  academic_year: c.academic_year,
  start_date: c.start_date,
  end_date: c.end_date,
  self_appraisal_deadline: c.self_appraisal_deadline,
  status: c.status
});

const COMMENT_LABELS = {
  strengths: "Strengths",
  areas_for_improvement: "Areas for Improvement",
  training_needs: "Training Needs",
  goals_for_next_year: "Goals for Next Year"
};

const packComments = (form) =>
  Object.entries(COMMENT_LABELS)
    .map(([key, label]) => {
      const val = (form[key] || "").trim();
      return val ? `${label}: ${val}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

const parseComments = (blob = "") => {
  const out = {
    strengths: "",
    areas_for_improvement: "",
    training_needs: "",
    goals_for_next_year: ""
  };
  if (!blob || typeof blob !== "string") return out;

  const labelToKey = Object.fromEntries(
    Object.entries(COMMENT_LABELS).map(([k, v]) => [v, k])
  );

  blob.split(/\n{2,}/).forEach((section) => {
    const match = section.match(/^([^:]+):\s*([\s\S]*)$/);
    if (!match) return;
    const key = labelToKey[match[1].trim()];
    if (key) out[key] = match[2].trim();
  });
  return out;
};

// Statuses after which the self-appraisal is locked (HOD has touched it or beyond).
const LOCKED_STATUSES = [
  "HOD_REVIEWED",
  "PRINCIPAL_REVIEWED",
  "MANAGEMENT_APPROVED",
  "COMPLETED",
  "CLOSED"
];

// ---- Component -------------------------------------------------------------

export default function HrmsAppraisal() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    cycle_id: null,
    kra_scores: KRA_FIELDS.map((k) => ({
      kra_id: k.kra_id,
      api_field: k.api_field,
      kra_name: KRA_LABELS[k.api_field],
      score: 0,
      comments: ""
    })),
    strengths: "",
    areas_for_improvement: "",
    training_needs: "",
    goals_for_next_year: ""
  };

  const [form, setForm] = useState(emptyForm);

  // ---- Data loading --------------------------------------------------------

  const loadCycles = async () => {
    try {
      setLoading(true);
      const res = await getAppraisalCycles();
      const raw = res?.resources?.data ?? res?.data ?? [];
      const cycs = toArray(raw).map(normalizeCycle).filter((c) => c.id != null);

      setCycles(cycs);
      if (cycs.length > 0 && !selectedCycleId) {
        setSelectedCycleId(cycs[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load appraisal cycles");
    } finally {
      setLoading(false);
    }
  };

  // Reshape the flat API GET response into what the UI consumes.
  const reshapeDetails = (raw, cycleId) => {
    const cycle = cycles.find((c) => c.id === cycleId) || {};
    if (!raw) return { cycle, self_appraisal: null, hod_review: null };

    // Build KRA rows from the 4 flat numeric fields.
    const kra_scores = KRA_FIELDS.map((def) => ({
      kra_id: def.kra_id,
      api_field: def.api_field,
      kra_name: KRA_LABELS[def.api_field],
      score: toUiScore(raw[def.api_field]),
      comments: ""
    }));

    // Compute overall self-score from the four components (API doesn't return self_score on GET).
    const valid = kra_scores.map((k) => k.score).filter((n) => n > 0);
    const overall_score = valid.length
      ? valid.reduce((a, b) => a + b, 0) / valid.length
      : 0;

    // Merge cycle fields from the flat response over the dropdown's cycle.
    const cycleFromApi = {
      ...cycle,
      id: raw.cycle_id ?? cycle.id,
      title: raw.cycle_name ?? cycle.title,
      academic_year: raw.academic_year ?? cycle.academic_year,
      status: raw.cycle_status ?? cycle.status
    };

    const self_appraisal = {
      appraisal_id: raw.appraisal_id,
      status: raw.status,                       // SELF_SUBMITTED | HOD_REVIEWED | ...
      self_submitted_at: raw.self_submitted_at,
      kra_scores,
      overall_score,
      ...parseComments(raw.self_comments || "")
    };

    // HOD review block — only present once HOD has acted.
    const hod_review =
      raw.hod_total_score != null ||
        raw.hod_remarks != null ||
        raw.hod_reviewed_at != null
        ? {
          total_score: raw.hod_total_score != null ? Number(raw.hod_total_score) : null,
          remarks: raw.hod_remarks,
          reviewed_at: raw.hod_reviewed_at,
          status: raw.status // overall status doubles as HOD status signal
        }
        : null;

    // Principal / management — extended to surface it since API already returns it.
    const principal_review =
      raw.principal_final_score != null ||
        raw.principal_grade != null ||
        raw.principal_remarks != null
        ? {
          final_score: raw.principal_final_score != null ? Number(raw.principal_final_score) : null,
          grade: raw.principal_grade,
          remarks: raw.principal_remarks,
          increment_pct: raw.management_approved_increment_pct != null
            ? Number(raw.management_approved_increment_pct)
            : null
        }
        : null;

    return { cycle: cycleFromApi, self_appraisal, hod_review, principal_review };
  };

  const loadDetails = async (cycleId) => {
    if (!cycleId) return;
    try {
      setLoading(true);
      const res = await getAppraisalDetails(cycleId);
      const raw = res?.resources?.data ?? res?.data ?? null;
      setDetails(reshapeDetails(raw, cycleId));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load appraisal details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCycleId) loadDetails(selectedCycleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCycleId]);

  const cycle = details?.cycle || cycles.find((c) => c.id === selectedCycleId) || {};
  const selfAppraisal = details?.self_appraisal;
  const hodReview = details?.hod_review;
  const principalReview = details?.principal_review;

  // Locked once the appraisal has moved past self-submission.
  const isSelfEditable =
    !selfAppraisal || !LOCKED_STATUSES.includes(selfAppraisal.status);

  // ---- Modal / Form --------------------------------------------------------

  const openAppraisalModal = () => {
    if (selfAppraisal) {
      const kra_scores = selfAppraisal.kra_scores.map((k) => ({
        kra_id: k.kra_id,
        api_field: k.api_field,
        kra_name: k.kra_name,
        score: k.score || 0,
        comments: k.comments || ""
      }));

      setForm({
        cycle_id: selectedCycleId,
        kra_scores,
        strengths: selfAppraisal.strengths || "",
        areas_for_improvement: selfAppraisal.areas_for_improvement || "",
        training_needs: selfAppraisal.training_needs || "",
        goals_for_next_year: selfAppraisal.goals_for_next_year || ""
      });
    } else {
      setForm({ ...emptyForm, cycle_id: selectedCycleId });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
  };

  const handleScoreChange = (index, scoreVal) => {
    setForm((prev) => {
      const updated = [...prev.kra_scores];
      updated[index] = { ...updated[index], score: parseFloat(scoreVal) };
      return { ...prev, kra_scores: updated };
    });
  };

  const handleCommentChange = (index, commentVal) => {
    setForm((prev) => {
      const updated = [...prev.kra_scores];
      updated[index] = { ...updated[index], comments: commentVal };
      return { ...prev, kra_scores: updated };
    });
  };

  const allKrasRated = form.kra_scores.every((k) => k.score >= SLIDER_MIN);
  const canSubmit = allKrasRated && !submitting;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!allKrasRated) {
      toast.error("Please rate every KRA before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const getScore = (apiField) =>
        form.kra_scores.find((k) => k.api_field === apiField)?.score ?? 0;

      const payload = {
        cycle_id: selectedCycleId,
        self_score_academic: toApiScore(getScore("self_score_academic")),
        self_score_pedagogy: toApiScore(getScore("self_score_pedagogy")),
        self_score_cocurricular: toApiScore(getScore("self_score_cocurricular")),
        self_score_cpd: toApiScore(getScore("self_score_cpd")),
        self_score: toApiScore(
          form.kra_scores.reduce((sum, k) => sum + (k.score || 0), 0) /
          (form.kra_scores.length || 1)
        ),
        self_comments: packComments(form)
      };

      await submitSelfAppraisal(payload);
      toast.success(selfAppraisal ? "Self-appraisal updated" : "Self-appraisal submitted");
      setIsModalOpen(false);
      await loadDetails(selectedCycleId);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save self-appraisal");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Render --------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Performance Appraisal (PMS)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Annual faculty performance evaluations, Key Result Areas (KRAs), and leadership feedback
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cycles.length > 0 && (
            <select
              value={selectedCycleId ?? ""}
              onChange={(e) => setSelectedCycleId(parseInt(e.target.value, 10))}
              className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.academic_year ? ` — ${c.academic_year}` : ""}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => loadDetails(selectedCycleId)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 shadow-sm transition"
            title="Refresh"
          >
            <LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-500" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !details ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-xs text-gray-400 animate-pulse">
          Loading appraisal evaluation cycle...
        </div>
      ) : (
        <>
          {/* Cycle banner */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gray-900">
                  {cycle.title || "—"}
                </h2>
                {cycle.status && (
                  <span className={getStatusBadge(cycle.status)}>{cycle.status}</span>
                )}
                {selfAppraisal?.status && (
                  <span className={getStatusBadge(selfAppraisal.status)}>
                    {selfAppraisal.status}
                  </span>
                )}
                {cycle.academic_year && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                    <LuCalendar className="w-3.5 h-3.5" />
                    {cycle.academic_year}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <LuClock className="w-3.5 h-3.5 text-orange-500" />
                Self-Appraisal Deadline:{" "}
                <strong className="text-gray-800">
                  {cycle.self_appraisal_deadline
                    ? formatDate(cycle.self_appraisal_deadline)
                    : cycle.end_date
                      ? formatDate(cycle.end_date)
                      : "—"}
                </strong>
                {selfAppraisal?.self_submitted_at && (
                  <span className="text-gray-400 ml-2">
                    · Submitted {formatDate(selfAppraisal.self_submitted_at)}
                  </span>
                )}
              </p>
            </div>

            <div>
              {isSelfEditable ? (
                <button
                  onClick={openAppraisalModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition"
                >
                  <LuPencil className="w-3.5 h-3.5" />
                  {selfAppraisal ? "Edit Self-Appraisal" : "Fill Self-Appraisal"}
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold">
                  <LuLock className="w-3.5 h-3.5" />
                  {selfAppraisal?.status === "PRINCIPAL_REVIEWED"
                    ? "Reviewed by Principal"
                    : selfAppraisal?.status === "MANAGEMENT_APPROVED"
                      ? "Approved by Management"
                      : selfAppraisal?.status === "COMPLETED" ||
                        selfAppraisal?.status === "CLOSED"
                        ? "Review Completed"
                        : "Locked — under review"}
                </div>
              )}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KRA scores */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <LuAward className="w-5 h-5 text-orange-500" />
                  <h3 className="text-sm font-bold text-gray-900">
                    Key Result Areas (KRA) Self-Scoring
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-gray-400">
                  Scale {SLIDER_MIN.toFixed(1)} - {SLIDER_MAX.toFixed(1)}
                </span>
              </div>

              {!selfAppraisal ? (
                <div className="text-center py-12 text-xs text-gray-400 space-y-3">
                  <p>No self-appraisal submitted for this cycle.</p>
                  {isSelfEditable && (
                    <button
                      onClick={openAppraisalModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition"
                    >
                      Start Self-Appraisal
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {selfAppraisal.kra_scores.map((kra) => (
                    <div
                      key={kra.kra_id}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-800">{kra.kra_name}</h4>
                        <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <LuStar className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-black text-amber-900">
                            {kra.score} / {SLIDER_MAX.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      {kra.comments && (
                        <p className="text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-100">
                          {kra.comments}
                        </p>
                      )}
                    </div>
                  ))}

                  {selfAppraisal.overall_score > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
                      <span className="text-xs font-bold text-orange-900">
                        Overall Self-Score
                      </span>
                      <span className="text-sm font-black text-orange-700">
                        {selfAppraisal.overall_score} / {SLIDER_MAX.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Self-reflection */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Self-Reflection & Goals
                </h3>

                <div className="space-y-3 text-xs">
                  {Object.entries(COMMENT_LABELS).map(([key, label]) => {
                    const value = selfAppraisal?.[key];
                    if (!value) return null;
                    return (
                      <div key={key}>
                        <span className="font-bold text-gray-500 uppercase text-[10px]">
                          {label}:
                        </span>
                        <p className="text-gray-800 mt-1 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100 whitespace-pre-wrap">
                          {value}
                        </p>
                      </div>
                    );
                  })}

                  {!selfAppraisal && (
                    <p className="text-gray-400 text-center py-6">
                      No reflection data available.
                    </p>
                  )}
                </div>
              </div>

              {/* HOD review */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <LuUserCheck className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-bold text-gray-900">HOD Review</h3>
                  </div>
                  {hodReview?.status && (
                    <span className={getStatusBadge(hodReview.status)}>
                      {hodReview.status}
                    </span>
                  )}
                </div>

                {hodReview ? (
                  <div className="text-xs space-y-2">
                    {hodReview.total_score != null && (
                      <div className="flex items-center justify-between bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                        <span className="font-bold text-orange-900">HOD Score</span>
                        <span className="font-black text-orange-700">
                          {hodReview.total_score} / {SLIDER_MAX.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {hodReview.remarks && (
                      <p className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-800 italic">
                        "{hodReview.remarks}"
                      </p>
                    )}
                    {hodReview.reviewed_at && (
                      <p className="text-[11px] text-gray-400">
                        Reviewed {formatDate(hodReview.reviewed_at)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-2">No HOD review yet.</p>
                )}
              </div>

              {/* Principal / management — only if API returns data */}
              {principalReview && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                    Principal / Management
                  </h3>
                  <div className="text-xs space-y-2">
                    {principalReview.final_score != null && (
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="font-bold text-gray-700">Final Score</span>
                        <span className="font-black text-gray-900">
                          {principalReview.final_score} / {SLIDER_MAX.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {principalReview.grade && (
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="font-bold text-gray-700">Grade</span>
                        <span className="font-black text-gray-900">
                          {principalReview.grade}
                        </span>
                      </div>
                    )}
                    {principalReview.increment_pct != null && (
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="font-bold text-gray-700">Approved Increment</span>
                        <span className="font-black text-gray-900">
                          {principalReview.increment_pct}%
                        </span>
                      </div>
                    )}
                    {principalReview.remarks && (
                      <p className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-800 italic">
                        "{principalReview.remarks}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ======================= MODAL ======================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                Faculty Self-Evaluation Form
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="space-y-3">
                <label className="font-bold text-gray-900 text-xs">
                  Key Result Areas (KRAs) Ratings & Notes
                </label>
                {form.kra_scores.map((kra, idx) => (
                  <div
                    key={kra.kra_id}
                    className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 text-xs">
                        {kra.kra_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-600 w-14 text-right">
                          {kra.score > 0 ? `${kra.score} / ${SLIDER_MAX}` : "—"}
                        </span>
                        <input
                          type="range"
                          min={SLIDER_MIN}
                          max={SLIDER_MAX}
                          step={SLIDER_STEP}
                          value={kra.score || SLIDER_MIN}
                          onChange={(e) => handleScoreChange(idx, e.target.value)}
                          className="w-24 accent-orange-500"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={kra.comments}
                      onChange={(e) => handleCommentChange(idx, e.target.value)}
                      placeholder="Comments (optional)"
                      className="w-full p-2 border border-gray-200 rounded-lg bg-white"
                    />
                  </div>
                ))}
              </div>

              {Object.entries(COMMENT_LABELS).map(([key, label]) => (
                <div key={key}>
                  <label className="font-semibold text-gray-700">{label}</label>
                  <textarea
                    rows={2}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
              ))}

              {!allKrasRated && (
                <p className="text-[11px] text-amber-600 font-semibold">
                  Please rate every KRA before submitting.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : selfAppraisal
                      ? "Update Self-Appraisal"
                      : "Submit Self-Appraisal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}