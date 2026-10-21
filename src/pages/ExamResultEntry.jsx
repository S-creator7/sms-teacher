import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { getSchedulerResults, submitBatchResults, getTeacherExams } from "../Utility/examApi";
import toast from "react-hot-toast";
import { getStudentList } from "../Utility/dashboardApi";
import { ArrowLeft } from "lucide-react";

export default function ExamResultEntry() {
  const { schedulerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const passed = (location?.state || {});

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [meta, setMeta] = useState({ total_marks: 0, exam_name: "Exam", subject_name: "-", class_name: "-", section_name: "-" });
  const [rows, setRows] = useState([]);
  const [ids, setIds] = useState({
    scheduler_id: schedulerId,
    exam_id: passed?.exam_id || "",
    subject_id: passed?.subject_id || "",
    classroom_id: passed?.classroom_id || "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await getSchedulerResults(schedulerId);
      const resultList = Array.isArray(res?.resources?.data) ? res.resources.data : [];
      const first = resultList[0] || {};
      let classroom_id = passed?.classroom_id || first.classroom_id || first.classroomId || "";

      let nextMeta = {
        exam_name: first.exam_name || passed?.exam_name,
        subject_name: first.subject_name || passed?.subject_name,
        class_name: first.class_name || passed?.class_name,
        section_name: first.section_name || passed?.section_name,
        total_marks: first.total_marks || passed?.total_marks,
        pass_marks: first.pass_marks || passed?.pass_marks,
        exam_date: first.exam_date || passed?.exam_date,
      };

      setIds((prev) => ({
        scheduler_id: schedulerId,
        exam_id: prev.exam_id || first.exam_id || first.examId || "",
        subject_id: prev.subject_id || first.subject_id || first.subjectId || "",
        classroom_id: prev.classroom_id || classroom_id || "",
      }));

      const existingByStudent = new Map();
      for (const r of resultList) {
        if (r && r.student_id != null) {
          existingByStudent.set(String(r.student_id), r);
        }
      }

      if ((!nextMeta.class_name || !nextMeta.section_name || !nextMeta.total_marks || !classroom_id)) {
        try {
          const exLimit = 100; let page = 1; let totalPages = 1; let found;
          do {
            const ex = await getTeacherExams({ filter: 'past', page, limit: exLimit });
            const exams = Array.isArray(ex?.resources?.data?.exams) ? ex.resources.data.exams : [];
            for (const e of exams) {
              if (String(e.scheduler_id) === String(schedulerId)) { found = e; break; }
            }
            const pg = ex?.resources?.data?.pagination; totalPages = Math.max(1, Number(pg?.total_pages || 1)); page += 1;
          } while (!found && page <= totalPages && page <= 5);
          if (found) {
            nextMeta = {
              exam_name: nextMeta.exam_name || found.exam_name,
              subject_name: nextMeta.subject_name || found.subject_name,
              class_name: nextMeta.class_name || found.class_name,
              section_name: nextMeta.section_name || found.section_name,
              total_marks: nextMeta.total_marks || found.total_marks,
              pass_marks: nextMeta.pass_marks || found.pass_marks,
              exam_date: nextMeta.exam_date || found.exam_date,
            };
            classroom_id = classroom_id || found.classroom_id;
          }
        } catch (_) { /* ignore */ }
      }

      setMeta(nextMeta);

      let students = [];
      if (classroom_id) {
        try {
          const sres = await getStudentList(classroom_id);
          const sdata = Array.isArray(sres?.resources?.data) ? sres.resources.data : [];
          students = sdata.map((s) => ({
            student_id: s.student_id,
            roll_no: s.roll_number,
            student_name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
          }));
        } catch (_) {
          students = resultList
            .filter((s) => s.student_id != null)
            .map((s) => ({ student_id: s.student_id, roll_no: s.roll_number, student_name: s.student_name }));
        }
      }

      const merged = students.map((stu) => {
        const ex = existingByStudent.get(String(stu.student_id));
        return {
          result_id: ex?.result_id,
          student_id: stu.student_id,
          roll_no: stu.roll_no,
          student_name: stu.student_name,
          marks_obtained: ex?.obtained_marks ?? "",
          remarks: ex?.remarks ?? "",
        };
      });
      setRows(merged);
      setCurrentPage(1); // Reset to first page when data loads
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [schedulerId]);

  function updateRow(idx, field, value) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const hasExisting = rows.some((r) => r.result_id != null);

      if (hasExisting) {
        toast.error("Mark update is not available. Only new results can be submitted.");
      }

      const max = Number(meta.total_marks) || undefined;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.result_id != null) continue;
        if (r.marks_obtained === "" || r.marks_obtained === null || r.marks_obtained === undefined) continue;
        const val = Number(r.marks_obtained);
        if (Number.isNaN(val)) {
          toast.error(`Row ${i + 1}: Marks must be a number`);
          return;
        }
        if (val < 0) {
          toast.error(`Row ${i + 1}: Marks cannot be negative`);
          return;
        }
        if (max !== undefined && val > max) {
          toast.error(`Row ${i + 1}: Marks cannot exceed total (${max})`);
          return;
        }
      }
      const emptyMarks = rows.filter(
  r =>
    r.result_id == null &&
    (r.marks_obtained === "" ||
      r.marks_obtained === null ||
      r.marks_obtained === undefined)
);

if (emptyMarks.length > 0) {
  toast.error("Marks are required for all students.");
  return;
}

      setSubmitting(true);
     const results = rows
  .filter((r) => r.result_id == null)
  .filter(
    (r) =>
      r.marks_obtained !== "" &&
      r.marks_obtained !== null &&
      r.marks_obtained !== undefined
  )
  .map((r) => ({
    student_id: r.student_id,
    marks_obtained: Number(r.marks_obtained),
    remarks: r.remarks || "",
  }));

      if (results.length === 0) {
  toast.error("No changes detected. Please enter marks before saving.");
  return;
}
      await submitBatchResults(schedulerId, results);
      toast.success("Results saved successfully");
      navigate(`/results/${schedulerId}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to save results");
    } finally {
      setSubmitting(false);
    }
  }

  const handleBack = () => {
    navigate(-1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRows = rows.slice(startIndex, endIndex);

  return (
    <div className="p-2 sm:p-3 md:p-4 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b bg-[#0F172A] rounded-t-xl flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors duration-200 group"
                title="Go Back"
              >
                <ArrowLeft size={18} className="group-hover:scale-110 transition-transform duration-200" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-white">{meta.exam_name} • {meta.subject_name}</h1>
                <p className="text-[10px] text-gray-300">{meta.class_name} • Sec {meta.section_name} • Max {meta.total_marks ?? '-'}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Link 
                to={`/results/${schedulerId}`} 
                className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs transition-colors duration-200"
              >
                View Results
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-3 sm:p-4">
            {error && (
              <div className="mb-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">{error}</div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left px-2 py-1.5 border-b font-semibold">#</th>
                    <th className="text-left px-2 py-1.5 border-b font-semibold">Roll No</th>
                    <th className="text-left px-2 py-1.5 border-b font-semibold">Student</th>
                    <th className="text-left px-2 py-1.5 border-b font-semibold">Marks</th>
                    <th className="text-left px-2 py-1.5 border-b font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(10)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-2 py-2 border-b"><div className="h-3.5 bg-gray-100 rounded"/></td>
                        ))}
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-4 text-center text-gray-500 text-xs">No students</td>
                    </tr>
                  ) : (
                    currentRows.map((r, idx) => {
                      const globalIdx = startIndex + idx;
                      return (
                        <tr key={r.student_id || idx} className="hover:bg-gray-50/80 transition">
                          <td className="px-2 py-1.5 border-b text-gray-500">{globalIdx + 1}</td>
                          <td className="px-2 py-1.5 border-b font-medium text-gray-800">{r.roll_no}</td>
                          <td className="px-2 py-1.5 border-b text-gray-700">{r.student_name || '-'}</td>
                          <td className="px-2 py-1.5 border-b w-28">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={meta.total_marks || undefined}
                              value={r.marks_obtained}
                              onChange={(e) => updateRow(globalIdx, "marks_obtained", e.target.value)}
                              disabled={r.result_id != null}
                              className="w-24 border border-gray-300 rounded-md px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#f86730] focus:border-transparent transition"
                            />
                          </td>
                          <td className="px-2 py-1.5 border-b">
                            <input
                              value={r.remarks}
                              onChange={(e) => updateRow(globalIdx, "remarks", e.target.value)}
                              disabled={r.result_id != null}
                              className="w-full border border-gray-300 rounded-md px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#f86730] focus:border-transparent transition"
                              placeholder="Remarks"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!loading && rows.length > itemsPerPage && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, rows.length)} of {rows.length} students
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-md border border-gray-200 text-xs bg-white hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-md border border-gray-200 text-xs bg-white hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Student Count */}
            {!loading && rows.length > 0 && (
              <div className="mt-2 text-xs text-gray-400">
                Total: {rows.length} student{rows.length > 1 ? 's' : ''}
              </div>
            )}

            <div className="mt-3 flex flex-col sm:flex-row items-center justify-end gap-1.5">
              <button 
                type="button" 
                onClick={load} 
                className="px-2.5 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300 text-xs transition-colors duration-200 w-full sm:w-auto" 
                disabled={loading || submitting}
              >
                Reset
              </button>
              <button 
                type="submit" 
                className="px-2.5 py-1.5 rounded-md bg-[#f86730] hover:bg-[#e55a29] text-white border border-[#f86730] text-xs transition-colors duration-200 disabled:opacity-60 w-full sm:w-auto" 
                disabled={loading || submitting}
              >
                {submitting ? "Saving..." : "Save Results"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}