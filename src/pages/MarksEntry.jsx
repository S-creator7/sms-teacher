import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTeacherClassrooms } from "../Utility/dashboardApi";
import { getTeacherExams } from "../Utility/examApi";

export default function MarksEntry() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [classOptions, setClassOptions] = useState([]); 
  const [sectionsByClassId, setSectionsByClassId] = useState({}); 

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");

  const [examOptions, setExamOptions] = useState([]); 
  const [selectedExam, setSelectedExam] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getTeacherClassrooms();
        const raw = Array.isArray(res?.resources?.data) ? res.resources.data : [];
        const classMap = new Map();
        const secByClass = {};
        raw.forEach((cls) => {
          if (cls.class_id != null) {
            classMap.set(String(cls.class_id), { class_id: cls.class_id, class_name: cls.class_name });
            const secs = Array.isArray(cls.sections) ? cls.sections : [];
            if (!secByClass[cls.class_id]) secByClass[cls.class_id] = [];
            secs.forEach((s) => {
              secByClass[cls.class_id].push({ classroom_id: s.classroom_id, section_name: s.section_name });
            });
          }
        });
        setClassOptions(Array.from(classMap.values()).map(c => ({ value: c.class_id, label: c.class_name })));
        setSectionsByClassId(secByClass);
      } catch (e) {
        setError(e?.response?.data?.message || e.message || "Failed to load classes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sectionOptions = useMemo(() => {
    const arr = sectionsByClassId[selectedClassId] || [];
    return arr.map((s) => ({ value: s.classroom_id, label: `Sec ${s.section_name}` }));
  }, [sectionsByClassId, selectedClassId]);

  async function loadPastExams() {
    if (!selectedClassroomId) {
      setExamOptions([]);
      setSelectedExam("");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await getTeacherExams({ filter: "past", page: 1, limit: 100, classroom_id: Number(selectedClassroomId) });
      const list = Array.isArray(res?.resources?.data?.exams) ? res.resources.data.exams : [];
      setExamOptions(
        list.map((e) => ({
          value: e.scheduler_id,
          label: `${e.exam_name || "Exam"} • ${e.subject_name || "-"} • ${e.class_name || "-"}-${e.section_name || "-"} (${e.exam_date || ""})`,
          meta: {
            scheduler_id: e.scheduler_id,
            exam_id: e.exam_id,
            subject_id: e.subject_id,
            classroom_id: e.classroom_id,
          },
        }))
      );
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedClassroomId("");
    setExamOptions([]);
    setSelectedExam("");
  }, [selectedClassId]);

  useEffect(() => {
    setExamOptions([]);
    setSelectedExam("");
    if (selectedClassroomId) loadPastExams();
  }, [selectedClassroomId]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Marks Entry</h1>
            <p className="text-xs text-gray-600">Select Class, Section and a past Exam to assign marks</p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-48"
              >
                <option value="">Select Class</option>
                {classOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Section</label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-40"
                disabled={!selectedClassId}
              >
                <option value="">Select Section</option>
                {sectionOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-72">
              <label className="text-xs text-gray-600">Exam (Past)</label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                disabled={!selectedClassroomId}
              >
                <option value="">Select Exam</option>
                {examOptions.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            <button
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-sm disabled:opacity-50"
              disabled={!selectedExam}
              onClick={() => {
                const ex = examOptions.find((x) => String(x.value) === String(selectedExam));
                if (!ex) return;
                navigate(`/exams/${ex.value}/entry`, { state: ex.meta });
              }}
            >
              Go to Marks Entry
            </button>
          </div>

          {!loading && selectedClassroom && examOptions.length === 0 && (
            <div className="mt-4 text-sm text-gray-600">No past exams found for the selected class/section.</div>
          )}

          <div className="mt-4 text-xs text-gray-600">
            {loading && <span>Loading...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
