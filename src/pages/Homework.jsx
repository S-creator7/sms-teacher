import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  getTeacherClassrooms,
  createHomework,
  getClassroomHomework,
} from "../Utility/homeworkApi";
import { Plus, List, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Homework() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("add");

  // classrooms
  const [classes, setClasses] = useState([]);
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
    if (activeTab === "all") {
      if (filterClassroomId) loadHomeworkList(filterClassroomId);
      else loadAllHomework();
    }
  }, [activeTab, filterClassroomId]);

  useEffect(() => {
    if (activeTab === "all" && !filterClassroomId && classes.length) {
      loadAllHomework();
    }
  }, [classes]);

  async function loadAllHomework() {
    try {
      setListLoading(true);
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
            results.push({
              ...item,
              class_name: item.class_name || sec.class_name,
              section_name: item.section_name || sec.section_name,
              classroom_id: item.classroom_id || sec.classroom_id,
            });
          });
        } catch (e) {
          console.debug("Failed to fetch homework for classroom", sec.classroom_id);
        }
      }
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
      toast.success("Homework created successfully!");
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

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
      {/* Clean Header - No dark background */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        <div className="flex items-center gap-3">
         
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Homework</h1>
        </div>
        <div className="flex gap-1.5 bg-white p-0.5 rounded-lg shadow-sm border border-gray-200 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("add")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex-1 sm:flex-none flex items-center justify-center gap-1.5 ${
              activeTab === "add" 
                ? "bg-[#f86730] text-white shadow-sm" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Plus size={14} />
            Add Homework
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex-1 sm:flex-none flex items-center justify-center gap-1.5 ${
              activeTab === "all" 
                ? "bg-[#f86730] text-white shadow-sm" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <List size={14} />
            All Homework
          </button>
        </div>
      </div>

      {activeTab === "add" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Form Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Create New Homework</h2>
            <p className="text-xs text-gray-500 mt-0.5">Fill in the details to assign homework to your students</p>
          </div>

          {/* Form Body */}
          <form className="p-4" onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedClassroomId("");
                    setSelectedSubjectId("");
                  }}
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  value={selectedClassroomId}
                  onChange={(e) => {
                    setSelectedClassroomId(e.target.value);
                    setSelectedSubjectId("");
                  }}
                  disabled={!selectedClassId}
                >
                  <option value="">Select Section</option>
                  {selectedSections.map((s) => (
                    <option key={s.classroom_id} value={s.classroom_id}>
                      {s.section_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={!selectedClassroomId}
                >
                  <option value="">Select Subject</option>
                  {selectedSubjects.map((sbj) => (
                    <option key={sbj.subject_id} value={sbj.subject_id}>
                      {sbj.subject_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Enter homework title"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition resize-y"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Enter detailed description of the homework"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium order-2 sm:order-1"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={!hasBasicForm || submitting}
                className={`px-4 py-2 rounded-md text-white font-medium transition text-sm order-1 sm:order-2 ${
                  !hasBasicForm || submitting 
                    ? "bg-[#f86730]/60 cursor-not-allowed" 
                    : "bg-[#f86730] hover:bg-[#e55a29] shadow-sm hover:shadow"
                }`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  "Create Homework"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "all" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* List Header - Clean, no dark background */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">All Homework</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {homeworkList.length > 0 
                    ? `${homeworkList.length} homework assignments found` 
                    : "No homework assignments"}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <select
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition"
                  value={filterClassId}
                  onChange={(e) => {
                    setFilterClassId(e.target.value);
                    setFilterClassroomId("");
                    setHomeworkList([]);
                  }}
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="inline-flex items-center justify-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 transition bg-white"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* List Body */}
          <div>
            {listLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#f86730] border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-500">Loading homework...</p>
              </div>
            ) : homeworkList?.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {homeworkList.map((h, idx) => (
                  <div key={`${h.homework_id || idx}`} className="px-4 py-3 hover:bg-gray-50/80 transition">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm md:text-base font-semibold text-gray-800 truncate">
                            {h.title || h.homework_title}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {h.subject_name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">
                          {h.description || h.homework_description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Due: {h.due_date}
                          </span>
                          {h.class_name && h.section_name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {h.class_name} - {h.section_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">No homework found</p>
                <p className="text-xs text-gray-500 mt-1">Create your first homework assignment</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}