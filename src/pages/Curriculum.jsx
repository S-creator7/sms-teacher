import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTeacherClassrooms } from "../Utility/attendanceApi";
import { getCurriculumApi, getSubjectsApi } from "../Utility/curriculumApi";

export default function Curriculum() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classrooms, setClassrooms] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [sectionsByClass, setSectionsByClass] = useState({});
  const [selected, setSelected] = useState({ class_id: "", classroom_id: "" });
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getTeacherClassrooms();
        const raw = res?.resources?.data || [];
        const classes = [];
        const byClass = {};
        raw.forEach((cls) => {
          const class_id = cls?.class_id;
          const class_name = cls?.class_name;
          if (!classes.find((c) => String(c.class_id) === String(class_id))) {
            classes.push({ class_id, class_name });
          }
          (cls?.sections || []).forEach((sec) => {
            if (!byClass[class_id]) byClass[class_id] = [];
            byClass[class_id].push({
              classroom_id: sec.classroom_id,
              section_name: sec.section_name,
              class_name
            });
          });
        });
        if (!mounted) return;
        setClassrooms(raw);
        setClassOptions(classes);
        setSectionsByClass(byClass);
        if (classes.length && (!selected.class_id || !selected.classroom_id)) {
          const initClass = classes[0].class_id;
          const initSection = (byClass[initClass] || [])[0]?.classroom_id || "";
          setSelected({ class_id: initClass, classroom_id: initSection });
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

  useEffect(() => {
    const opts = sectionsByClass[selected.class_id] || [];
    setSectionOptions(opts);
    if (opts.length && !opts.find((o) => String(o.classroom_id) === String(selected.classroom_id))) {
      setSelected((s) => ({ ...s, classroom_id: opts[0].classroom_id }));
    }
  }, [selected.class_id, sectionsByClass]);

  async function loadCurriculum() {
    if (!selected.class_id || !selected.classroom_id) return;
    try {
      setLoading(true);
      setError("");
      const [subRes, curRes] = await Promise.all([
        getSubjectsApi(selected.classroom_id),
        getCurriculumApi({ class_id: selected.class_id, classroom_id: selected.classroom_id }),
      ]);
      const subjectList = Array.isArray(subRes?.resources?.data) ? subRes.resources.data : [];
      const overview = Array.isArray(curRes?.resources?.data) ? curRes.resources.data : [];
      const byId = {};
      overview.forEach((s) => { if (s?.subject_id != null) byId[s.subject_id] = s; });
      const merged = subjectList.map((s) => {
        const ov = byId[s.subject_id];
        return ov ? ov : {
          subject_id: s.subject_id,
          subject_name: s.subject_name,
          chapters: 0,
          progress_percentage: 0
        };
      });
      setSubjects(merged);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load curriculum");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selected.class_id && selected.classroom_id) {
      loadCurriculum();
    }
  }, [selected.class_id, selected.classroom_id]);

  const selectedMeta = useMemo(() => {
    const classData = classrooms.find(c => String(c.class_id) === String(selected.class_id));
    if (!classData) return null;
    const sectionData = classData.sections?.find(s => String(s.classroom_id) === String(selected.classroom_id));
    return sectionData ? {
      class_name: classData.class_name,
      section_name: sectionData.section_name
    } : null;
  }, [classrooms, selected]);

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Curriculum Overview</h1>
              <p className="text-sm text-gray-600 mb-2">Track subject progress and chapter completion</p>
              {selectedMeta && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="bg-[#f86730]/10 text-[#f86730] px-2 py-1 rounded font-medium">
                    Class: {selectedMeta.class_name}
                  </span>
                  <span className="bg-[#0F172A]/10 text-[#0F172A] px-2 py-1 rounded font-medium">
                    Section: {selectedMeta.section_name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[120px] focus:ring-1 focus:ring-[#f86730] focus:border-[#f86730]"
                  value={selected.class_id}
                  onChange={(e) => setSelected((s) => ({ class_id: e.target.value, classroom_id: "" }))}
                >
                  {classOptions.map((c) => (
                    <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[120px] focus:ring-1 focus:ring-[#f86730] focus:border-[#f86730]"
                  value={selected.classroom_id}
                  onChange={(e) => setSelected((s) => ({ ...s, classroom_id: e.target.value }))}
                  disabled={!sectionOptions.length}
                >
                  {sectionOptions.map((s) => (
                    <option key={s.classroom_id} value={s.classroom_id}>Sec {s.section_name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={loadCurriculum}
                className="px-4 py-2 rounded-lg bg-[#f86730] hover:bg-[#e55a29] text-white font-medium text-sm transition-colors disabled:bg-gray-400"
                disabled={loading || !classrooms.length}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Chapters</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Progress</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-3/4" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-1/4" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-1/2" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-1/3" /></td>
                    </tr>
                  ))
                ) : !classrooms.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="text-gray-500 text-sm">No classrooms assigned to you.</div>
                    </td>
                  </tr>
                ) : subjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="text-gray-500 text-sm">No curriculum found for selected class</div>
                    </td>
                  </tr>
                ) : (
                  subjects.map((s, idx) => (
                    <tr key={s.subject_id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-700">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <button
                          className="text-[#0F172A] hover:text-[#f86730] text-sm font-medium hover:underline transition-colors"
                          onClick={() => navigate(`/curriculum/detail/${s.subject_id}?class_id=${selected.class_id}&classroom_id=${selected.classroom_id}&class_name=${encodeURIComponent(selectedMeta?.class_name || '')}&section_name=${encodeURIComponent(selectedMeta?.section_name || '')}`)}
                        >
                          {s.subject_name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-sm">
                        {s.chapters} Chapters
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 bg-[#f86730] rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(0, Math.min(100, Number(s.progress_percentage) || 0))}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-700 min-w-[40px]">
                            {Math.max(0, Math.min(100, Number(s.progress_percentage) || 0))}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                         className="bg-[#fb8c5a] text-white hover:bg-[#f86730] font-medium px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-sm"
                          onClick={() => navigate(`/curriculum/detail/${s.subject_id}?class_id=${selected.class_id}&classroom_id=${selected.classroom_id}`)}
                        >
                          View Details
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