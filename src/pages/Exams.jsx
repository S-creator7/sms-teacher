import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTeacherExams } from "../Utility/examApi";

function formatDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d)) return String(dt);
  return d.toLocaleDateString();
}

export default function Exams() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((e) =>
      `${e.exam_name || ""} ${e.subject_name || ""} ${e.class_name || ""} ${e.section_name || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await getTeacherExams();
      // backend: { status, code, message, resources: { data: { exams: [], pagination: {} } } }
      const list = Array.isArray(res?.resources?.data?.exams)
        ? res.resources.data.exams
        : [];
      const rows = list.map((r) => ({
        scheduler_id: r.scheduler_id,
        exam_id: r.exam_id,
        exam_name: r.exam_name || "Exam",
        exam_type: r.exam_type || "-",
        subject_id: r.subject_id,
        subject_name: r.subject_name || "-",
        classroom_id: r.classroom_id,
        class_name: r.class_name || "-",
        section_name: r.section_name || "-",
        exam_date: r.exam_date,
        start_time: r.start_time,
        end_time: r.end_time,
        total_marks: r.total_marks,
        pass_marks: r.pass_marks,
        room_number: r.room_number,
        session_name: r.session_name,
      }));
      setItems(rows);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Exams</h1>
            <p className="text-xs text-gray-600">All scheduled exams assigned to you</p>
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Search exam, subject, class"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
            />
            <button onClick={load} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm" disabled={loading}>
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
                  <th className="text-left px-3 py-2 border-b">Exam</th>
                  <th className="text-left px-3 py-2 border-b">Subject</th>
                  <th className="text-left px-3 py-2 border-b">Class</th>
                  <th className="text-left px-3 py-2 border-b">Date</th>
                  <th className="text-left px-3 py-2 border-b">Max</th>
                  <th className="text-left px-3 py-2 border-b">Pass</th>
                  <th className="text-left px-3 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">No exams found</td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.scheduler_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-b font-medium">{e.exam_name}</td>
                      <td className="px-3 py-2 border-b">{e.subject_name}</td>
                      <td className="px-3 py-2 border-b">{e.class_name} • {e.section_name}</td>
                      <td className="px-3 py-2 border-b">{formatDate(e.exam_date)}</td>
                      <td className="px-3 py-2 border-b">{e.total_marks ?? '-'}</td>
                      <td className="px-3 py-2 border-b">{e.pass_marks ?? '-'}</td>
                      <td className="px-3 py-2 border-b">
                        <div className="flex gap-2">
                          <Link to={`/results/${e.scheduler_id}`} className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-xs">
                            View Results
                          </Link>
                          <Link to={`/exams/${e.scheduler_id}/entry`} className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-xs">
                            Enter/Update Results
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
