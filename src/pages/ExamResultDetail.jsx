import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { getSchedulerResults, getTeacherExams } from "../Utility/examApi";

function pct(marks, max) {
  if (!max || max <= 0 || marks == null) return null;
  return Math.round((Number(marks) / Number(max)) * 1000) / 10; // 1 decimal
}

export default function ExamResultDetail() {
  const { schedulerId } = useParams();
  const location = useLocation();
  const passed = (location?.state || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({});
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      `${r.roll_no || ""} ${r.student_name || ""}`.toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await getSchedulerResults(schedulerId);
      const list = Array.isArray(res?.resources?.data) ? res.resources.data : [];
      const first = list[0] || {};

      // NOTE: teacher scheduler results API doesn't include exam_name/class_name/section_name.
      // Prefer anything that might come from API, then from route state, then from teacher exams list lookup.
      let nextMeta = {
        subject_id: first.subject_id || passed?.subject_id,
        subject_name: first.subject_name || passed?.subject_name,
        exam_name: first.exam_name || passed?.exam_name,
        class_name: first.class_name || passed?.class_name,
        section_name: first.section_name || passed?.section_name,
        total_marks: first.total_marks || passed?.total_marks,
        pass_marks: first.pass_marks || passed?.pass_marks,
        exam_date: first.exam_date || passed?.exam_date,
      };

      // Fallback: lookup scheduler in teacher past exams to get exam_name/subject/class/section
      if (!nextMeta.exam_name || !nextMeta.subject_name || !nextMeta.class_name || !nextMeta.section_name) {
        try {
          const exLimit = 100;
          let page = 1;
          let totalPages = 1;
          let found;
          do {
            const ex = await getTeacherExams({ filter: "past", page, limit: exLimit });
            const exams = Array.isArray(ex?.resources?.data?.exams) ? ex.resources.data.exams : [];
            for (const e of exams) {
              if (String(e.scheduler_id) === String(schedulerId)) {
                found = e;
                break;
              }
            }
            const pg = ex?.resources?.data?.pagination;
            totalPages = Math.max(1, Number(pg?.total_pages || 1));
            page += 1;
          } while (!found && page <= totalPages && page <= 5);

          if (found) {
            nextMeta = {
              ...nextMeta,
              exam_name: nextMeta.exam_name || found.exam_name,
              subject_name: nextMeta.subject_name || found.subject_name,
              class_name: nextMeta.class_name || found.class_name,
              section_name: nextMeta.section_name || found.section_name,
              total_marks: nextMeta.total_marks || found.total_marks,
              pass_marks: nextMeta.pass_marks || found.pass_marks,
              exam_date: nextMeta.exam_date || found.exam_date,
              subject_id: nextMeta.subject_id || found.subject_id,
            };
          }
        } catch (_) {
          // ignore
        }
      }

      setMeta(nextMeta);

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
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
              {meta.exam_name || "Exam"} • {meta.subject_name || "-"}
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              {(meta.class_name || "-")}{" "}• Sec {(meta.section_name || "-")}{" "}• Max {meta.total_marks ?? "-"}
              {meta.exam_date ? ` • ${meta.exam_date}` : ""}
            </p>
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <Link to="/results" className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm">Back to Results</Link>
            <Link to={`/exams/${schedulerId}/entry`} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-sm">Enter Results</Link>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <input
              placeholder="Search student or roll no"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-72"
            />
            <div className="text-xs text-gray-500 sm:text-right">
              {loading ? "Loading..." : `${filtered.length} student(s)`}
            </div>
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
                    const percentage = pct(s.marks, meta.total_marks);
                    // Prefer API's is_passed if provided, else fallback to pass_marks comparison
                    const pass = s.marks == null ? null : (typeof s.is_passed === 'number' ? s.is_passed === 1 : (meta.pass_marks != null ? Number(s.marks) >= Number(meta.pass_marks) : (percentage != null ? percentage >= 35 : null)));
                    return (
                      <tr key={s.student_id || idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border-b">{idx + 1}</td>
                        <td className="px-3 py-2 border-b">{s.roll_no}</td>
                        <td className="px-3 py-2 border-b">{s.student_name || '-'}</td>
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