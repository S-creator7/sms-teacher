import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getExamResultsList, getTeacherExams } from "../Utility/examApi";

export default function ExamResults() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [schedulerId, setSchedulerId] = useState("");
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [examOptions, setExamOptions] = useState([]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((r) =>
      `${r.student_name || ""} ${r.roll_number || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const analytics = useMemo(() => {
    const arr = filtered;
    if (!arr.length) return null;
    const graded = arr.filter((x) => x.obtained_marks != null);
    const pending = arr.length - graded.length;
    const marks = graded.map((x) => Number(x.obtained_marks));
    const totalMarks = graded.length ? marks.reduce((a, b) => a + b, 0) : 0;
    const avg = graded.length ? Math.round((totalMarks / graded.length) * 10) / 10 : 0;
    const max = graded.length ? Math.max(...marks) : null;
    const min = graded.length ? Math.min(...marks) : null;
    const passCount = graded.filter((x) => (typeof x.is_passed === 'number' ? x.is_passed === 1 : (x.pass_marks != null ? Number(x.obtained_marks) >= Number(x.pass_marks) : false))).length;
    const passRate = arr.length ? Math.round((passCount / arr.length) * 1000) / 10 : 0;
    return { total: arr.length, graded: graded.length, pending, avg, max, min, passRate };
  }, [filtered]);

  async function load(p = page) {
    try {
      setLoading(true);
      setError("");
      const res = await getExamResultsList({
        page: p,
        limit,
        ...(schedulerId ? { scheduler_id: Number(schedulerId) } : {}),
      });
      const list = Array.isArray(res?.resources?.data) ? res.resources.data : [];
      const rows = list.map((r) => ({
        result_id: r.result_id,
        scheduler_id: r.scheduler_id,
        student_id: r.student_id,
        obtained_marks: r.obtained_marks,
        remarks: r.remarks,
        student_name: r.student_name,
        roll_number: r.roll_number,
        exam_date: r.exam_date,
        subject_id: r.subject_id,
        total_marks: r.total_marks,
        pass_marks: r.pass_marks,
        is_passed: r.is_passed,
        exam_name: r.exam_name,
        subject_name: r.subject_name,
        class_name: r.class_name,
        section_name: r.section_name,
      }));
      setItems(rows);
      const pg = res?.resources?.pagination;
      if (pg) setPagination(pg);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(1); setPage(1); }, [schedulerId, limit]);

  useEffect(() => {
    (async () => {
      try {
        const schedSet = new Set();
        const schedMeta = new Map();
        const resLimit = 100;
        let rPage = 1;
        let rTotalPages = 1;
        do {
          const r = await getExamResultsList({ page: rPage, limit: resLimit });
          const results = Array.isArray(r?.resources?.data) ? r.resources.data : [];
          for (const row of results) {
            if (row?.scheduler_id != null) {
              schedSet.add(row.scheduler_id);
              if (!schedMeta.has(row.scheduler_id)) schedMeta.set(row.scheduler_id, { exam_date: row.exam_date });
            }
          }
          const pg = r?.resources?.pagination;
          rTotalPages = Math.max(1, Number(pg?.total_pages || 1));
          rPage += 1;
        } while (rPage <= rTotalPages && rPage <= 5);

        const examBySid = new Map();
        const exLimit = 100;
        let ePage = 1;
        let eTotalPages = 1;
        do {
          const ex = await getTeacherExams({ filter: 'past', page: ePage, limit: exLimit });
          const exams = Array.isArray(ex?.resources?.data?.exams) ? ex.resources.data.exams : [];
          for (const e of exams) {
            if (e?.scheduler_id != null) examBySid.set(e.scheduler_id, e);
          }
          const pg = ex?.resources?.data?.pagination;
          eTotalPages = Math.max(1, Number(pg?.total_pages || 1));
          ePage += 1;
        } while (ePage <= eTotalPages && ePage <= 5);

        const options = Array.from(schedSet).map((sid) => {
          const e = examBySid.get(sid);
          if (e) {
            return {
              value: sid,
              label: `${e.exam_name || 'Exam'} • ${e.subject_name || '-'} • ${e.class_name || '-'}-${e.section_name || '-'}`,
              meta: {
                scheduler_id: sid,
                classroom_id: e.classroom_id,
                class_id: e.class_id,
                subject_id: e.subject_id,
                exam_id: e.exam_id,
              }
            };
          }
          const meta = schedMeta.get(sid) || {};
          const label = `Exam • ${meta.exam_date || '—'}`;
          return { value: sid, label, meta: { scheduler_id: sid } };
        });

        setExamOptions(options);
      } catch (error) { console.log(error) }
    })();
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors duration-200 group"
              title="Go Back"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Exam Results</h1>
              <p className="text-xs text-gray-500 mt-0.5">Overview of exam results</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Filters */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <select
                  value={schedulerId}
                  onChange={(e) => setSchedulerId(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition bg-white min-w-[200px]"
                >
                  <option value="">All Exams</option>
                  {examOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  placeholder="Search by name or roll no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition bg-white min-w-[180px]"
                />
                <button 
                  onClick={() => load(1)} 
                  className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm transition"
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>
              <button
                className="px-3 py-1.5 rounded-md bg-[#f86730] hover:bg-[#e55a29] text-white border border-[#f86730] text-sm transition disabled:opacity-50"
                disabled={!schedulerId}
                onClick={() => {
                  if (!schedulerId) return;
                  const base = import.meta.env.VITE_SMS_DASHBOARD_URL || "";
                  const selected = examOptions.find(o => String(o.value) === String(schedulerId));
                  const qp = new URLSearchParams();
                  qp.set('scheduler_id', schedulerId);
                  if (selected?.meta?.classroom_id) qp.set('classroom_id', selected.meta.classroom_id);
                  if (selected?.meta?.class_id) qp.set('class_id', selected.meta.class_id);
                  if (selected?.meta?.subject_id) qp.set('subject_id', selected.meta.subject_id);
                  if (selected?.meta?.exam_id) qp.set('exam_id', selected.meta.exam_id);
                  const query = qp.toString();
                  const url = base
                    ? `${base.replace(/\/$/, '')}/results?${query}`
                    : `/results/${schedulerId}`; 
                  window.open(url, "_blank");
                }}
              >
                Open Report
              </button>
            </div>
          </div>

          <div className="p-4">
            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">{error}</div>
            )}

            {/* Analytics Cards */}
            {analytics && (
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Total</div>
                  <div className="text-base font-bold text-gray-900">{analytics.total}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Graded</div>
                  <div className="text-base font-bold text-gray-900">{analytics.graded}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Pending</div>
                  <div className="text-base font-bold text-gray-900">{analytics.pending}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Avg Marks</div>
                  <div className="text-base font-bold text-gray-900">{analytics.avg}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Highest</div>
                  <div className="text-base font-bold text-gray-900">{analytics.max ?? '-'}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Pass Rate</div>
                  <div className="text-base font-bold text-gray-900">{analytics.passRate}%</div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Student</th>
                    <th className="text-left px-3 py-2 font-semibold">Roll No</th>
                    <th className="text-left px-3 py-2 font-semibold">Exam Date</th>
                    <th className="text-left px-3 py-2 font-semibold">Obtained</th>
                    <th className="text-left px-3 py-2 font-semibold">Total</th>
                    <th className="text-left px-3 py-2 font-semibold">Pass</th>
                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(7)].map((_, i) => (
                      <tr key={i} className="animate-pulse odd:bg-white even:bg-gray-50">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-3 py-2.5"><div className="h-3.5 bg-gray-100 rounded"/></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-500 text-sm">No data found</td>
                    </tr>
                  ) : (
                    filtered.map((e) => (
                      <tr key={e.result_id} className="hover:bg-gray-50/80 transition odd:bg-white even:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{e.student_name}</td>
                        <td className="px-3 py-2 text-gray-700">{e.roll_number}</td>
                        <td className="px-3 py-2 text-gray-700">{e.exam_date}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900">{e.obtained_marks}</td>
                        <td className="px-3 py-2 text-gray-700">{e.total_marks}</td>
                        <td className="px-3 py-2 text-gray-700">{e.pass_marks}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            e.is_passed === 1 
                              ? "bg-green-100 text-green-700 border-green-200" 
                              : "bg-red-100 text-red-700 border-red-200"
                          }`}>
                            {e.is_passed === 1 ? "Pass" : "Fail"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-600">
                Page {pagination.page} of {pagination.total_pages} • Total {pagination.total}
              </div>
              <div className="flex gap-1.5">
                <button
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-xs bg-white hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => { const p = pagination.page - 1; setPage(p); load(p); }}
                >
                  Previous
                </button>
                <button
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-xs bg-white hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || pagination.page >= pagination.total_pages}
                  onClick={() => { const p = pagination.page + 1; setPage(p); load(p); }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}