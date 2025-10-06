import { useEffect, useMemo, useState } from "react";
import { getTeacherClassrooms } from "../Utility/attendanceApi";
import {
  getSubjectsApi,
  getModulesApi,
  createModuleApi,
  createTopicApi,
} from "../Utility/curriculumApi";
import toast from "react-hot-toast";

export default function CurriculumManage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [classrooms, setClassrooms] = useState([]);
  const [selected, setSelected] = useState({ class_id: "", classroom_id: "" });

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");

  const [modules, setModules] = useState([]);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", periods: "" });
  const [topicForm, setTopicForm] = useState({ module_id: "", title: "", description: "" });

  // load classrooms
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getTeacherClassrooms();
        const raw = res?.resources?.data || [];
        const flat = [];
        raw.forEach((cls) => {
          const class_id = cls?.class_id ?? cls?.id;
          const class_name = cls?.class_name;
          (cls?.sections || []).forEach((sec) => {
            flat.push({ class_id, classroom_id: sec.classroom_id, class_name, section_name: sec.section_name });
          });
        });
        if (!mounted) return;
        setClassrooms(flat);
        if (flat.length) setSelected({ class_id: flat[0].class_id, classroom_id: flat[0].classroom_id });
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e.message || "Failed to load classrooms");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // load subjects for selected classroom
  useEffect(() => {
    if (!selected.classroom_id) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getSubjectsApi(selected.classroom_id);
        setSubjects(res?.resources?.data || []);
        setSelectedSubject("");
        setModules([]);
      } catch (e) {
        setError(e?.response?.data?.message || e.message || "Failed to load subjects");
        setSubjects([]);
      } finally { setLoading(false); }
    })();
  }, [selected.classroom_id]);

  // load modules for selected subject
  useEffect(() => {
    if (!selected.class_id || !selectedSubject) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getModulesApi({ class_id: selected.class_id, subject_id: selectedSubject });
        setModules(res?.resources?.data || []);
      } catch (e) {
        setError(e?.response?.data?.message || e.message || "Failed to load modules");
        setModules([]);
      } finally { setLoading(false); }
    })();
  }, [selected.class_id, selectedSubject]);

  async function submitModule(e) {
    e.preventDefault();
    if (!selectedSubject) return toast.error("Select a subject first");
    const body = {
      module_name: moduleForm.title,
      subject_id: selectedSubject,
      description: moduleForm.description,
      required_period: Number(moduleForm.periods) || null,
    };
    try {
      setLoading(true);
      const res = await createModuleApi(body);
      if (res?.status) {
        toast.success(res?.message || "Module created");
        setModuleForm({ title: "", description: "", periods: "" });
        // refresh list
        const list = await getModulesApi({ class_id: selected.class_id, subject_id: selectedSubject });
        setModules(list?.resources?.data || []);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to create module");
    } finally { setLoading(false); }
  }

  async function submitTopic(e) {
    e.preventDefault();
    if (!topicForm.module_id) return toast.error("Select a chapter");
    const body = {
      module_id: topicForm.module_id,
      topic_name: topicForm.title,
      description: topicForm.description,
    };
    try {
      setLoading(true);
      const res = await createTopicApi(body);
      if (res?.status) {
        toast.success(res?.message || "Topic created");
        setTopicForm({ module_id: "", title: "", description: "" });
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to create topic");
    } finally { setLoading(false); }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Manage Curriculum</h1>
            <p className="text-xs text-gray-600">Add chapters and topics</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[220px]"
              value={`${selected.class_id}|${selected.classroom_id}`}
              onChange={(e) => {
                const [class_id, classroom_id] = e.target.value.split("|");
                setSelected({ class_id, classroom_id });
              }}
            >
              {classrooms.map(c => (
                <option key={`${c.class_id}|${c.classroom_id}`} value={`${c.class_id}|${c.classroom_id}`}>
                  {c.class_name} • Sec {c.section_name}
                </option>
              ))}
            </select>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!classrooms.length}
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Module */}
          <form onSubmit={submitModule} className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Add Chapter</h2>
            <div className="grid grid-cols-1 gap-3">
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Chapter title"
                value={moduleForm.title}
                onChange={(e) => setModuleForm(v => ({ ...v, title: e.target.value }))}
              />
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Chapter description"
                value={moduleForm.description}
                onChange={(e) => setModuleForm(v => ({ ...v, description: e.target.value }))}
              />
              <input
                type="number"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Required periods"
                value={moduleForm.periods}
                onChange={(e) => setModuleForm(v => ({ ...v, periods: e.target.value }))}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button disabled={loading || !selectedSubject || !moduleForm.title}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">
                Add Chapter
              </button>
            </div>
          </form>

          {/* Create Topic */}
          <form onSubmit={submitTopic} className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Add Topic</h2>
            <div className="grid grid-cols-1 gap-3">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={topicForm.module_id}
                onChange={(e) => setTopicForm(v => ({ ...v, module_id: e.target.value }))}
                disabled={!modules.length}
              >
                <option value="">Select Chapter</option>
                {modules.map(m => (
                  <option key={m.module_id} value={m.module_id}>{m.module_name}</option>
                ))}
              </select>
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Topic title"
                value={topicForm.title}
                onChange={(e) => setTopicForm(v => ({ ...v, title: e.target.value }))}
                disabled={!modules.length}
              />
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Topic description"
                value={topicForm.description}
                onChange={(e) => setTopicForm(v => ({ ...v, description: e.target.value }))}
                disabled={!modules.length}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button disabled={loading || !topicForm.module_id || !topicForm.title}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">
                Add Topic
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
