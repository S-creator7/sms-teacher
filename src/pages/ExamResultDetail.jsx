import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSchedulerResults } from "../Utility/examApi";

function pct(marks, max) {
  if (!max || max <= 0 || marks == null) return null;
  return Math.round((Number(marks) / Number(max)) * 1000) / 10; // 1 decimal
}

export default function ExamResultDetail() {
  const { schedulerId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({});
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      `${r.roll_no || ""} ${r.first_name || ""} ${r.last_name || ""}`.toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await getSchedulerResults(schedulerId);
      const list = Array.isArray(res?.resources?.data) ? res.resources.data : [];
      const first = list[0] || {};
      setMeta({
        subject_id: first.subject_id,
        total_marks: first.total_marks,
        pass_marks: first.pass_marks,
        exam_date: first.exam_date,
      });

      setRows(
        list.map((s) => ({
          result_id: s.result_id,
          student_id: s.student_id,
          student_name: s.student_name,
          roll_no: s.roll_number,
          marks: s.obtained_marks,
          remarks: s.remarks,
          total_marks: s.total_marks,
          pass_marks: s.pass_marks,
          is_passed: s.is_passed,
        }))
      );
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [schedulerId]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{meta.exam_name} • {meta.subject_name}</h1>
            <p className="text-xs text-gray-600">{meta.class_name} • Sec {meta.section_name} • Max {meta.max_marks ?? '-'}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/results" className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm">Back to Results</Link>
            <Link to={`/exams/${schedulerId}/entry`} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-sm">Enter/Update Results</Link>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <div className="mb-3">
            <input
              placeholder="Search student or roll no"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 border-b">#</th>
                  <th className="text-left px-3 py-2 border-b">Roll No</th>
                  <th className="text-left px-3 py-2 border-b">Student</th>
                  <th className="text-left px-3 py-2 border-b">Marks</th>
                  <th className="text-left px-3 py-2 border-b">%</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">No students</td>
                  </tr>
                ) : (
                  filtered.map((s, idx) => {
                    const percentage = pct(s.marks, meta.max_marks);
                    const pass = percentage != null && percentage >= 35; 
                    return (
                      <tr key={s.student_id || idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border-b">{idx + 1}</td>
                        <td className="px-3 py-2 border-b">{s.roll_no}</td>
                        <td className="px-3 py-2 border-b">{`${s.first_name || ""} ${s.last_name || ""}`}</td>
                        <td className="px-3 py-2 border-b">{s.marks ?? '-'}</td>
                        <td className="px-3 py-2 border-b">{percentage ?? '-'}</td>
                        <td className="px-3 py-2 border-b">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${s.marks == null ? "bg-yellow-100 text-yellow-700 border-yellow-200" : pass ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                            {s.marks == null ? "Pending" : pass ? "Pass" : "Fail"}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-b">{s.remarks || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}