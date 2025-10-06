import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTeacherClassrooms } from "../Utility/attendanceApi";
import { getCurriculumApi } from "../Utility/curriculumApi";

export default function Curriculum() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [classrooms, setClassrooms] = useState([]);
  const [selected, setSelected] = useState({ class_id: "", classroom_id: "" });

  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getTeacherClassrooms();
        const raw = res?.resources?.data || [];
        // Flatten with class_id and classroom_id
        const flat = [];
        raw.forEach((cls) => {
          const class_id = cls?.class_id ?? cls?.id;
          const class_name = cls?.class_name;
          (cls?.sections || []).forEach((sec) => {
            flat.push({
              class_id,
              classroom_id: sec.classroom_id,
              class_name,
              section_name: sec.section_name,
            });
          });
        });
        if (!mounted) return;
        setClassrooms(flat);
        if (flat.length && (!selected.class_id || !selected.classroom_id)) {
          setSelected({ class_id: flat[0].class_id, classroom_id: flat[0].classroom_id });
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e.message || "Failed to load classrooms");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function loadCurriculum() {
    if (!selected.class_id || !selected.classroom_id) return;
    try {
      setLoading(true);
      setError("");
      const res = await getCurriculumApi({ class_id: selected.class_id, classroom_id: selected.classroom_id });
      const list = res?.resources?.data || [];
      setSubjects(list);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load curriculum");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCurriculum(); }, [selected.class_id, selected.classroom_id]);

  const selectedMeta = useMemo(() => {
    return classrooms.find(c => String(c.class_id) === String(selected.class_id) && String(c.classroom_id) === String(selected.classroom_id));
  }, [classrooms, selected]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Curriculum</h1>
            <p className="text-xs text-gray-600">Subject progress by class</p>
            {selectedMeta && (
              <p className="text-xs text-gray-500 mt-1">Class: <span className="font-semibold text-gray-700">{selectedMeta.class_name}</span> • Section: <span className="font-semibold text-gray-700">{selectedMeta.section_name}</span></p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[220px]"
              value={selected.class_id && selected.classroom_id ? `${selected.class_id}|${selected.classroom_id}` : ""}
              onChange={(e) => {
                const [class_id, classroom_id] = e.target.value.split("|");
                setSelected({ class_id, classroom_id });
              }}
            >
              {!classrooms.length && <option value="">No classrooms assigned</option>}
              {classrooms.map(c => (
                <option key={`${c.class_id}|${c.classroom_id}`} value={`${c.class_id}|${c.classroom_id}`}>
                  {c.class_name} • Sec {c.section_name}
                </option>
              ))}
            </select>
            <button
              onClick={loadCurriculum}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm"
              disabled={loading || !classrooms.length}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 sm:p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 border-b">#</th>
                  <th className="text-left px-3 py-2 border-b">Subject</th>
                  <th className="text-left px-3 py-2 border-b">Chapters</th>
                  <th className="text-left px-3 py-2 border-b">Progress</th>
                  <th className="text-left px-3 py-2 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                    </tr>
                  ))
                ) : !classrooms.length ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">No classrooms assigned to you.</td>
                  </tr>
                ) : subjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">No curriculum found</td>
                  </tr>
                ) : (
                  subjects.map((s, idx) => (
                    <tr key={s.subject_id || idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-b">{idx + 1}</td>
                      <td className="px-3 py-2 border-b">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => navigate(`/curriculum/detail/${s.subject_id}?class_id=${selected.class_id}&classroom_id=${selected.classroom_id}&class_name=${encodeURIComponent(selectedMeta?.class_name || '')}&section_name=${encodeURIComponent(selectedMeta?.section_name || '')}`)}
                        >
                          {s.subject_name}
                        </button>
                      </td>
                      <td className="px-3 py-2 border-b">{s.chapters} Chapters</td>
                      <td className="px-3 py-2 border-b">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-3 bg-green-500 rounded-full"
                              style={{ width: `${Math.max(0, Math.min(100, Number(s.progress_percentage) || 0))}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-700">{Math.max(0, Math.min(100, Number(s.progress_percentage) || 0))}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-b">
                        <button
                          className="text-blue-600 hover:underline text-sm"
                          onClick={() => navigate(`/curriculum/detail/${s.subject_id}?class_id=${selected.class_id}&classroom_id=${selected.classroom_id}`)}
                        >
                          View details
                        </button>
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
