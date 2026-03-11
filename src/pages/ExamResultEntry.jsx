import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { getSchedulerResults, submitBatchResults, getTeacherExams } from "../Utility/examApi";
import toast from "react-hot-toast";
import { getStudentList } from "../Utility/dashboardApi";

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

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await getSchedulerResults(schedulerId);
      const resultList = Array.isArray(res?.resources?.data) ? res.resources.data : [];
      const first = resultList[0] || {};
      let classroom_id = passed?.classroom_id || first.classroom_id || first.classroomId || "";

      // Prefer meta from results; if absent, fallback to passed state; if still absent, lookup from teacher exams
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

      // Build a map of existing results by student_id for quick merge
      const existingByStudent = new Map();
      for (const r of resultList) {
        if (r && r.student_id != null) {
          existingByStudent.set(String(r.student_id), r);
        }
      }

      // If we still lack meta or classroom_id (e.g. no results yet and no state), try to find exam by scheduler via teacher exams (paged)
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

      // Fetch complete classroom student list so all students appear even if no results exist yet
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
          // fallback: if students can't be loaded, at least show those present in results
          students = resultList
            .filter((s) => s.student_id != null)
            .map((s) => ({ student_id: s.student_id, roll_no: s.roll_number, student_name: s.student_name }));
        }
      }

      // Merge students with existing results (so empty rows appear)
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

      // Client validation for marks
      const max = Number(meta.total_marks) || undefined;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.result_id != null) continue;
        if (r.marks_obtained === "" || r.marks_obtained === null || r.marks_obtained === undefined) continue; // allow empty -> will be treated as 0 below
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

      setSubmitting(true);
      const results = rows
        .filter((r) => r.result_id == null)
        .filter((r) => !(r.marks_obtained === "" || r.marks_obtained === null || r.marks_obtained === undefined))
        .map((r) => ({
          student_id: r.student_id,
          marks_obtained: Number(r.marks_obtained),
          remarks: r.remarks || undefined,
        }));

      if (results.length === 0) {
        toast.error("No new results to submit");
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

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{meta.exam_name} • {meta.subject_name}</h1>
            <p className="text-xs text-gray-600">{meta.class_name} • Sec {meta.section_name} • Max {meta.total_marks ?? '-'}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/results/${schedulerId}`} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm">View Results</Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 border-b">#</th>
                  <th className="text-left px-3 py-2 border-b">Roll No</th>
                  <th className="text-left px-3 py-2 border-b">Student</th>
                  <th className="text-left px-3 py-2 border-b">Marks</th>
                  <th className="text-left px-3 py-2 border-b">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">No students</td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={r.student_id || idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-b">{idx + 1}</td>
                      <td className="px-3 py-2 border-b">{r.roll_no}</td>
                      <td className="px-3 py-2 border-b">{r.student_name || '-'}</td>
                      <td className="px-3 py-2 border-b w-32">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={meta.total_marks || undefined}
                          value={r.marks_obtained}
                          onChange={(e) => updateRow(idx, "marks_obtained", e.target.value)}
                          disabled={r.result_id != null}
                          className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 border-b">
                        <input
                          value={r.remarks}
                          onChange={(e) => updateRow(idx, "remarks", e.target.value)}
                          disabled={r.result_id != null}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                          placeholder="Remarks"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" onClick={load} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm" disabled={loading || submitting}>
              Reset
            </button>
            <button type="submit" className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-sm" disabled={loading || submitting}>
              {submitting ? "Saving..." : "Save Results"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
