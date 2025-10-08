import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { subjectDetailsApi, updateTopicProgressApi, getSubjectsApi } from "../Utility/curriculumApi";
import toast from "react-hot-toast";
import { getTeacherClassrooms } from "../Utility/attendanceApi";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ChapterTopics() {
  const { moduleId } = useParams();
  const query = useQuery();
  const classroom_id = query.get("classroom_id");
  const class_id = query.get("class_id");
  const subject_id = query.get("subject_id");
  const module_name = query.get("module_name");
  const class_name = query.get("class_name");
  const section_name = query.get("section_name");

  const [headerClassName, setHeaderClassName] = useState(class_name || "");
  const [headerSectionName, setHeaderSectionName] = useState(section_name || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topics, setTopics] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTopic, setPendingTopic] = useState(null);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState(new Set());

  const counts = useMemo(() => {
    const total = topics.length;
    const completed = topics.filter(t => String(t.progress_status || '').toLowerCase() === 'completed').length;
    const pending = Math.max(0, total - completed);
    return { total, completed, pending };
  }, [topics]);

  async function loadTopics() {
    if (!moduleId || !subject_id || !class_id || !classroom_id) return;
    try {
      setLoading(true);
      setError("");
      const res = await subjectDetailsApi({
        subject_id: Number(subject_id),
        class_id: Number(class_id),
        classroom_id: Number(classroom_id),
      });
      const modules = Array.isArray(res?.resources?.data) ? res.resources.data : [];
      const mod = modules.find(m => String(m.module_id) === String(moduleId));
      const raw = Array.isArray(mod?.topics) ? mod.topics : [];
      const seen = new Set();
      const unique = [];
      for (const t of raw) {
        const id = String(t.topic_id ?? "");
        if (!seen.has(id)) {
          seen.add(id);
          unique.push(t);
        }
      }
      setTopics(unique);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load topics");
      setTopics([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadTopics(); }, [moduleId]);

  useEffect(() => {
    (async () => {
      if (headerClassName && headerSectionName) return;
      try {
        if (!classroom_id) return;
        const res = await getTeacherClassrooms();
        const raw = Array.isArray(res?.resources?.data) ? res.resources.data : [];
        for (const cls of raw) {
          const cname = cls.class_name;
          const sections = Array.isArray(cls.sections) ? cls.sections : [];
          const found = sections.find((s) => String(s.classroom_id) === String(classroom_id));
          if (found) {
            if (!headerClassName) setHeaderClassName(cname || "");
            if (!headerSectionName) setHeaderSectionName(found.section_name || "");
            break;
          }
        }
      } catch (_) {}
    })();
  }, [classroom_id, headerClassName, headerSectionName]);

  useEffect(() => {
    (async () => {
      try {
        if (!classroom_id) return;
        const res = await getSubjectsApi(Number(classroom_id));
        const list = Array.isArray(res?.resources?.data) ? res.resources.data : [];
        const ids = new Set(list.map(s => Number(s.subject_id)));
        setAssignedSubjectIds(ids);
      } catch (_) {
        setAssignedSubjectIds(new Set());
      }
    })();
  }, [classroom_id]);

  const canUpdate = assignedSubjectIds.has(Number(subject_id));

  function openConfirm(topic) {
    setPendingTopic(topic);
    setConfirmOpen(true);
  }

  async function markCompleted(topic) {
    if (!topic?.topic_id) return;
    try {
      setSavingId(topic.topic_id);
      await updateTopicProgressApi({
        topic_id: Number(topic.topic_id),
        progress_status: "Completed",
        classroom_id: Number(classroom_id),
      });
      toast.success("Topic status updated");
      setConfirmOpen(false);
      setPendingTopic(null);
      await loadTopics();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Failed to update topic status";
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{module_name || 'Chapter'} Topics</h1>
            <p className="text-sm text-gray-600 mb-2">Manage topic progress for this chapter</p>
            {(headerClassName || headerSectionName) && (
              <div className="flex items-center gap-3 text-sm">
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                  Class: {headerClassName || '-'}
                </span>
                <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                  Section: {headerSectionName || '-'}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6">
            {!canUpdate && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                You are not assigned to this subject in the selected classroom. Status updates are disabled.
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-sm text-gray-600">Total Topics</div>
                <div className="text-2xl font-bold text-gray-900">{counts.total}</div>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="text-sm text-green-700">Completed</div>
                <div className="text-2xl font-bold text-green-800">{counts.completed}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm text-amber-700">Pending</div>
                <div className="text-2xl font-bold text-amber-800">{counts.pending}</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Topic</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                      </tr>
                    ))
                  ) : topics.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center">
                        <div className="text-gray-500 text-sm">No topics found</div>
                      </td>
                    </tr>
                  ) : (
                    topics.map((t, idx) => (
                      <tr key={t.topic_id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm text-gray-700">{t.topic_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.topic_description || t.description || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            String(t.progress_status).toLowerCase() === 'completed' 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {t.progress_status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="bg-white border border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-medium px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!canUpdate || String(t.progress_status).toLowerCase() === 'completed' || savingId === t.topic_id}
                            onClick={() => openConfirm(t)}
                          >
                            Mark Completed
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

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900">Confirm Completion</h3>
              <p className="text-sm text-gray-600 mt-1">This will mark the topic as completed for this class/section.</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              <div className="text-sm text-gray-800">Topic: <span className="font-semibold">{pendingTopic?.topic_name}</span></div>
              <div className="text-sm text-gray-600">Class: <span className="font-medium">{class_name || '-'}</span> • Section: <span className="font-medium">{section_name || '-'}</span></div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-sm font-medium"
                onClick={() => { setConfirmOpen(false); setPendingTopic(null); }}
                disabled={!!savingId}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-60"
                onClick={() => pendingTopic && markCompleted(pendingTopic)}
                disabled={!!savingId}
              >
                {savingId ? 'Saving...' : 'Mark Completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
