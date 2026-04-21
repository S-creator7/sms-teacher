import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  getTeacherClassrooms,
  createHomework,
  getClassroomHomework,
} from "../Utility/homeworkApi";

export default function Homework() {
  const [activeTab, setActiveTab] = useState("add");

  // classrooms
  const [classes, setClasses] = useState([]); // [{class_id, class_name, sections:[{classroom_id, section_name, subjectList:[{subject_id, subject_name}]}]}]
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // form
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // list state
  const [filterClassId, setFilterClassId] = useState("");
  const [filterClassroomId, setFilterClassroomId] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [homeworkList, setHomeworkList] = useState([]);

  const selectedSections = useMemo(() => {
    return classes.find((c) => String(c.class_id) === String(selectedClassId))?.sections || [];
  }, [classes, selectedClassId]);

  const selectedSubjects = useMemo(() => {
    return selectedSections.find((s) => String(s.classroom_id) === String(selectedClassroomId))?.subjectList || [];
  }, [selectedSections, selectedClassroomId]);

  const filterSections = useMemo(() => {
    return classes.find((c) => String(c.class_id) === String(filterClassId))?.sections || [];
  }, [classes, filterClassId]);

  const hasBasicForm = useMemo(() => {
    return (
      form.title?.trim() &&
      form.description?.trim() &&
      form.due_date &&
      selectedClassroomId &&
      selectedSubjectId
    );
  }, [form, selectedClassroomId, selectedSubjectId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getTeacherClassrooms();
        const data = Array.isArray(res?.resources?.data)
          ? res.resources.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setClasses(data);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load classrooms");
      }
    })();
  }, []);

  useEffect(() => {
    // Auto load homework list
    if (activeTab === "all") {
      if (filterClassroomId) loadHomeworkList(filterClassroomId);
      else loadAllHomework();
    }
  }, [activeTab, filterClassroomId]);

  // When classes load later, auto-load all homework if on All tab and no filter
  useEffect(() => {
    if (activeTab === "all" && !filterClassroomId && classes.length) {
      loadAllHomework();
    }
  }, [classes]);

  async function loadAllHomework() {
    try {
      setListLoading(true);
      // aggregate homework across all teacher sections
      const allSections = classes.flatMap(c => (c.sections || []).map(s => ({
        class_id: c.class_id,
        class_name: c.class_name,
        section_name: s.section_name,
        classroom_id: s.classroom_id
      })));

      const results = [];
      for (const sec of allSections) {
        try {
          const res = await getClassroomHomework(sec.classroom_id);
          const arr = Array.isArray(res?.resources?.data)
            ? res.resources.data
            : Array.isArray(res?.data)
            ? res.data
            : [];
          arr.forEach(item => {
            // enrich with class/section if not present
            results.push({
              ...item,
              class_name: item.class_name || sec.class_name,
              section_name: item.section_name || sec.section_name,
              classroom_id: item.classroom_id || sec.classroom_id,
            });
          });
        } catch (e) {
          // continue on per-section error but notify softly in console
          // eslint-disable-next-line no-console
          console.debug("Failed to fetch homework for classroom", sec.classroom_id, e?.response?.data?.message || e?.message);
        }
      }
      // sort by due_date desc then created_at desc if available
      results.sort((a, b) => String(b.due_date || '').localeCompare(String(a.due_date || '')) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
      setHomeworkList(results);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load homework");
    } finally {
      setListLoading(false);
    }
  }

  async function loadHomeworkList(classroomId) {
    try {
      setListLoading(true);
      const res = await getClassroomHomework(classroomId);
      const arr = Array.isArray(res?.resources?.data)
        ? res.resources.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setHomeworkList(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load homework");
    } finally {
      setListLoading(false);
    }
  }

  function resetForm() {
    setForm({ title: "", description: "", due_date: "" });
    setSelectedClassId("");
    setSelectedClassroomId("");
    setSelectedSubjectId("");
  }

  async function handleCreate(e) {
    e?.preventDefault?.();
    if (!hasBasicForm) return;
    try {
      setSubmitting(true);
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_date,
        subject_id: Number(selectedSubjectId),
      };
      const classroomId = Number(selectedClassroomId);
      await createHomework(classroomId, body);
      toast.success("Homework created");
      resetForm();
      setActiveTab("all");
      if (classroomId) {
        setFilterClassId(String(classes.find(c => (c.sections||[]).some(s => String(s.classroom_id)===String(classroomId)))?.class_id || ""));
        setFilterClassroomId(String(classroomId));
        loadHomeworkList(classroomId);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create homework");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 font-sans text-base text-black">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Homework</h1>
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow border border-gray-200 w-full sm:w-auto">
          {[
            { key: "add", label: "Add Homework" },
            { key: "all", label: "All Homework" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-1 sm:flex-none ${
                activeTab === t.key ? "bg-gray-600 text-white shadow" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "add" && (
        <div className="bg-white rounded-2xl shadow p-6">
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleCreate}>
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Class</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedClassroomId("");
                  setSelectedSubjectId("");
                }}
              >
                <option value="">Select</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Section</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={selectedClassroomId}
                onChange={(e) => {
                  setSelectedClassroomId(e.target.value);
                  setSelectedSubjectId("");
                }}
                disabled={!selectedClassId}
              >
                <option value="">Select</option>
                {selectedSections.map((s) => (
                  <option key={s.classroom_id} value={s.classroom_id}>
                    {s.section_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Subject</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassroomId}
              >
                <option value="">Select</option>
                {selectedSubjects.map((sbj) => (
                  <option key={sbj.subject_id} value={sbj.subject_id}>
                    {sbj.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Enter homework title"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                rows={4}
                className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Enter description"
              />
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={!hasBasicForm || submitting}
                className={`px-5 py-2 rounded-md text-white font-medium transition ${
                  !hasBasicForm || submitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? "Submitting..." : "Create Homework"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "all" && (
        <div className="bg-white rounded-2xl shadow">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4">
            <div className="text-sm text-gray-600">All homework assigned by you</div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={filterClassId}
                onChange={(e) => {
                  setFilterClassId(e.target.value);
                  setFilterClassroomId("");
                  setHomeworkList([]);
                }}
              >
                <option value="" disabled>Select Class</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={filterClassroomId}
                onChange={(e) => setFilterClassroomId(e.target.value)}
                disabled={!filterClassId}
              >
                <option value="">All Sections</option>
                {filterSections.map((s) => (
                  <option key={s.classroom_id} value={s.classroom_id}>
                    {s.section_name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => (filterClassroomId ? loadHomeworkList(filterClassroomId) : loadAllHomework())}
                className="text-sm px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                Refresh
              </button>
            </div>
          </div>

          <div>
            {listLoading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : homeworkList?.length ? (
              homeworkList.map((h, idx) => (
                <div key={`${h.homework_id || idx}`} className="px-4 py-4 border-t first:border-t-0 hover:bg-gray-50/60 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base md:text-lg font-semibold text-gray-800">{h.title || h.homework_title}</h3>
                        <span className="font-bold text-base md:text-lg font-semibold text-gray-800 border rounded px-3">{h.subject_name}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-2">{h.description || h.homework_description}</div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Due: {h.due_date}</span>
                        {h.class_name && h.section_name && (
                          <span className="px-2 py-0.5 rounded bg-gray-100">Class: {h.class_name} - {h.section_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">No homework found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
