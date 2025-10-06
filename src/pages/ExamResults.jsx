import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getExamResultsList } from "../Utility/examApi";

export default function ExamResults() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [schedulerId, setSchedulerId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, total_pages: 1 });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((r) =>
      `${r.exam_name || ""} ${r.subject_name || ""} ${r.class_name || ""} ${r.section_name || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  async function load(p = page) {
    try {
      setLoading(true);
      setError("");
      const res = await getExamResultsList({
        page: p,
        limit,
        ...(schedulerId ? { scheduler_id: Number(schedulerId) } : {}),
        ...(subjectId ? { subject_id: Number(subjectId) } : {}),
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

  useEffect(() => { load(1); setPage(1); }, [schedulerId, subjectId, limit]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Results</h1>
            <p className="text-xs text-gray-600">Overview of exam results</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Scheduler ID (optional)"
              value={schedulerId}
              onChange={(e) => setSchedulerId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-44"
            />
            <input
              placeholder="Subject ID (optional)"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-44"
            />
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
            />
            <button onClick={() => load(1)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm" disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Student</th>
                  <th className="text-left px-3 py-2 border-b">Roll No</th>
                  <th className="text-left px-3 py-2 border-b">Exam Date</th>
                  <th className="text-left px-3 py-2 border-b">Obtained</th>
                  <th className="text-left px-3 py-2 border-b">Total</th>
                  <th className="text-left px-3 py-2 border-b">Pass</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">No data</td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.result_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-b font-medium">{e.student_name}</td>
                      <td className="px-3 py-2 border-b">{e.roll_number}</td>
                      <td className="px-3 py-2 border-b">{e.exam_date}</td>
                      <td className="px-3 py-2 border-b">{e.obtained_marks}</td>
                      <td className="px-3 py-2 border-b">{e.total_marks}</td>
                      <td className="px-3 py-2 border-b">{e.pass_marks}</td>
                      <td className="px-3 py-2 border-b">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${e.is_passed === 1 ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                          {e.is_passed === 1 ? "Pass" : "Fail"}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-b">
                        <div className="flex gap-2">
                          <Link to={`/results/${e.scheduler_id}`} className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-xs">
                            View Schedule
                          </Link>
                          <Link to={`/exams/${e.scheduler_id}/entry`} className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-xs">
                            Update Marks
                          </Link>
                        </div>
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
