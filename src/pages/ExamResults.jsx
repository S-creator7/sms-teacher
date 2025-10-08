import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getExamResultsList, getTeacherExams, getAdminExamList } from "../Utility/examApi";

export default function ExamResults() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [schedulerId, setSchedulerId] = useState("");
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [examOptions, setExamOptions] = useState([]); // {value: scheduler_id, label: "Exam • Subject • Class-Section"}
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((r) =>
      `${r.exam_name || ""} ${r.subject_name || ""} ${r.class_name || ""} ${r.section_name || ""}`
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
        const ex = await getTeacherExams({ page: 1, limit: 200 });
        const list = Array.isArray(ex?.resources?.data?.exams) ? ex.resources.data.exams : [];
        const initial = list.map((e) => ({
          value: e.scheduler_id,
          label: `${e.exam_name || 'Exam'} • ${e.subject_name || '-'} • ${e.class_name || '-'}-${e.section_name || '-'}`,
          meta: {
            scheduler_id: e.scheduler_id,
            classroom_id: e.classroom_id,
            class_id: e.class_id,
            subject_id: e.subject_id,
            exam_id: e.exam_id,
          },
        }));

        // Try to enrich from admin list if some fields are missing
        let enriched = initial;
        try {
          const admin = await getAdminExamList({ page: 1, limit: 500 });
          const adminList = Array.isArray(admin?.resources?.data?.exams)
            ? admin.resources.data.exams
            : Array.isArray(admin?.resources?.data) ? admin.resources.data : [];
          const byScheduler = new Map();
          for (const a of adminList) {
            const sid = a.scheduler_id ?? a.schedule_id;
            if (sid != null) byScheduler.set(String(sid), a);
          }
          enriched = initial.map(o => {
            const a = byScheduler.get(String(o.value));
            if (!a) return o;
            return {
              ...o,
              meta: {
                ...o.meta,
                scheduler_id: o.meta.scheduler_id,
                classroom_id: o.meta.classroom_id ?? a.classroom_id ?? a.section_id ?? a.classroomId,
                class_id: o.meta.class_id ?? a.class_id ?? a.classId,
                subject_id: o.meta.subject_id ?? a.subject_id ?? a.subjectId,
                exam_id: o.meta.exam_id ?? a.exam_id ?? a.examId,
              }
            };
          });
        } catch (_) {
          // ignore admin enrich errors (permissions or shape)
        }
        setExamOptions(enriched);
      } catch (_) { /* ignore */ }
    })();
  }, []);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Results</h1>
            <p className="text-xs text-gray-600">Overview of exam results</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={schedulerId}
              onChange={(e) => setSchedulerId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
            >
              <option value="">All Exams</option>
              {examOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
            />
            <button onClick={() => load(1)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm" disabled={loading}>
              Refresh
            </button>
            <button
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-sm disabled:opacity-50"
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
                  : `/results/${schedulerId}`; // fallback to internal route if env not set
                window.open(url, "_blank");
              }}
            >
              Open Report (Dashboard)
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          {analytics && (
            <div className="mb-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><div className="text-gray-500">Total</div><div className="text-gray-900 font-semibold">{analytics.total}</div></div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><div className="text-gray-500">Graded</div><div className="text-gray-900 font-semibold">{analytics.graded}</div></div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><div className="text-gray-500">Pending</div><div className="text-gray-900 font-semibold">{analytics.pending}</div></div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><div className="text-gray-500">Avg</div><div className="text-gray-900 font-semibold">{analytics.avg}</div></div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><div className="text-gray-500">Highest</div><div className="text-gray-900 font-semibold">{analytics.max ?? '-'}</div></div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><div className="text-gray-500">Pass Rate</div><div className="text-gray-900 font-semibold">{analytics.passRate}%</div></div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2">Student</th>
                  <th className="text-left px-3 py-2">Roll No</th>
                  <th className="text-left px-3 py-2">Exam Date</th>
                  <th className="text-left px-3 py-2">Obtained</th>
                  <th className="text-left px-3 py-2">Total</th>
                  <th className="text-left px-3 py-2">Pass</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(7)].map((_, i) => (
                    <tr key={i} className="animate-pulse odd:bg-white even:bg-gray-50">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-100 rounded"/></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">No data</td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.result_id} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{e.student_name}</td>
                      <td className="px-3 py-2">{e.roll_number}</td>
                      <td className="px-3 py-2">{e.exam_date}</td>
                      <td className="px-3 py-2">{e.obtained_marks}</td>
                      <td className="px-3 py-2">{e.total_marks}</td>
                      <td className="px-3 py-2">{e.pass_marks}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${e.is_passed === 1 ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                          {e.is_passed === 1 ? "Pass" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-gray-600">Page {pagination.page} of {pagination.total_pages} • Total {pagination.total}</div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                disabled={loading || pagination.page <= 1}
                onClick={() => { const p = pagination.page - 1; setPage(p); load(p); }}
              >
                Prev
              </button>
              <button
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
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
  );
}
