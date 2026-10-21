import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { getSchedulerResults, getTeacherExams } from "../Utility/examApi";
import { useNavigate } from "react-router-dom";

function pct(marks, max) {
  if (!max || max <= 0 || marks == null) return null;
  return Math.round((Number(marks) / Number(max)) * 1000) / 10;
}

export default function ExamResultDetail() {
  const { schedulerId } = useParams();
  const navigate = useNavigate();
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
        } catch (_) {}
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

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBack}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors duration-200 group"
              title="Go Back"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                {meta.exam_name || "Exam"} • {meta.subject_name || "-"}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {meta.class_name || "-"} • Sec {meta.section_name || "-"} • Max {meta.total_marks ?? "-"}
                {meta.exam_date ? ` • ${meta.exam_date}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link 
              to="/results" 
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
            >
              Back to Results
            </Link>
            <Link 
              to={`/exams/${schedulerId}/entry`} 
              className="px-3 py-1.5 rounded-lg bg-[#f86730] hover:bg-[#e55a29] text-white transition text-sm font-medium shadow-sm hover:shadow"
            >
              Enter Results
            </Link>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {error && (
            <div className="m-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="p-4">
            {/* Search and Count */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <input
                placeholder="Search student or roll no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition w-full sm:w-72"
              />
              <div className="text-xs text-gray-500">
                {loading ? "Loading..." : `${filtered.length} student${filtered.length !== 1 ? 's' : ''}`}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">#</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Roll No</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Student</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Marks</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">%</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(10)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-3 py-2.5"><div className="h-3.5 bg-gray-100 rounded"/></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-500 text-sm">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s, idx) => {
                      const percentage = pct(s.marks, meta.total_marks);
                      const pass = s.marks == null ? null : (typeof s.is_passed === 'number' ? s.is_passed === 1 : (meta.pass_marks != null ? Number(s.marks) >= Number(meta.pass_marks) : (percentage != null ? percentage >= 35 : null)));
                      return (
                        <tr key={s.student_id || idx} className="border-t border-gray-50 hover:bg-gray-50/80 transition">
                          <td className="px-3 py-2 text-gray-600">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{s.roll_no}</td>
                          <td className="px-3 py-2 text-gray-700">{s.student_name || '-'}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900">{s.marks ?? '-'}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900">{percentage ?? '-'}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              s.marks == null 
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200" 
                                : pass 
                                ? "bg-green-50 text-green-700 border-green-200" 
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {s.marks == null ? "Pending" : pass ? "Pass" : "Fail"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{s.remarks || '-'}</td>
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
    </div>
  );
}