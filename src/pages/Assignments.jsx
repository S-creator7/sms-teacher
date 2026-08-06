import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  getTeacherClassrooms,
  getClassroomStudents,
  createAssignment,
  getAssignmentsList,
  deleteAssignment,
  updateStudentAssignmentStatus,
} from "../Utility/assignmentApi";
import { Plus, List, RefreshCw, ChevronDown, ChevronUp, X, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const levelOptions = [
  { value: "classroom", label: "Classroom" },
  { value: "group", label: "Group" },
  { value: "individual", label: "Individual" },
];

export default function Assignments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("add");

  // Classrooms and Students
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [students, setStudents] = useState([]);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    assignment_level: "classroom",
    student_ids: [],
  });
  const [submitting, setSubmitting] = useState(false);

  // List State
  const [listLoading, setListLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [filterClassId, setFilterClassId] = useState("");
  const [filterClassroomId, setFilterClassroomId] = useState("");
  const [updatingStudentId, setUpdatingStudentId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [search, setSearch] = useState("");
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishRemark, setFinishRemark] = useState("");
  const [finishTargetId, setFinishTargetId] = useState(null);

  const selectedSections = useMemo(() => {
    return classes.find((c) => String(c.class_id) === String(selectedClassId))?.sections || [];
  }, [classes, selectedClassId]);

  const hasBasicForm = useMemo(() => {
    return (
      form.title?.trim() &&
      form.description?.trim() &&
      form.due_date &&
      selectedClassroomId &&
      form.assignment_level
    );
  }, [form, selectedClassroomId]);

  const isStudentSelectionRequired = useMemo(() => {
    return form.assignment_level === "group" || form.assignment_level === "individual";
  }, [form.assignment_level]);

  useEffect(() => {
    loadClassrooms();
    loadAssignments();
  }, []);

  useEffect(() => {
    if (selectedClassroomId) {
      loadStudents(selectedClassroomId);
    } else {
      setStudents([]);
    }
  }, [selectedClassroomId]);

  useEffect(() => {
    loadAssignments();
  }, [filterClassroomId]);

  async function loadClassrooms() {
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
  }

  async function loadStudents(classroomId) {
    try {
      const res = await getClassroomStudents(classroomId);
      const arr = Array.isArray(res?.resources?.data)
        ? res.resources.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setStudents(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load students");
    }
  }

  async function loadAssignments() {
    try {
      setListLoading(true);
      const params = filterClassroomId ? { classroom_id: filterClassroomId } : {};
      const res = await getAssignmentsList(params);
      const arr = Array.isArray(res?.resources?.data)
        ? res.resources.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setAssignments(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load assignments");
    } finally {
      setListLoading(false);
    }
  }

  function resetForm() {
    setForm({ title: "", description: "", due_date: "", assignment_level: "classroom", student_ids: [] });
    setSelectedClassId("");
    setSelectedClassroomId("");
    setStudents([]);
  }

  async function handleCreateAssignment(e) {
    e?.preventDefault?.();
    if (!hasBasicForm) return;
    if (isStudentSelectionRequired) {
      if (form.assignment_level === "individual" && form.student_ids.length !== 1) {
        toast.error("Select exactly one student for Individual level");
        return;
      }
      if (form.assignment_level === "group" && form.student_ids.length < 2) {
        toast.error("Select at least two students for Group level");
        return;
      }
    }

    try {
      setSubmitting(true);
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_date,
        classroom_id: Number(selectedClassroomId),
        assignment_level: form.assignment_level,
        ...(isStudentSelectionRequired ? { student_ids: form.student_ids.map((id) => Number(id)) } : {}),
      };
      await createAssignment(body);
      toast.success("Assignment created successfully!");
      resetForm();
      setActiveTab("all");
      loadAssignments();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(assignment_id) {
    if (!window.confirm("Delete this assignment? This cannot be undone.")) return;
    try {
      setDeletingId(assignment_id);
      await deleteAssignment(assignment_id);
      toast.success("Assignment deleted");
      loadAssignments();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete assignment");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUpdateStudentStatus(student_assignment_id, nextStatus, remark = "") {
    try {
      setUpdatingStudentId(student_assignment_id);
      const body = {
        assignment_status: nextStatus,
        remark,
        finish_date: nextStatus === "Finish" ? new Date().toISOString().slice(0, 10) : null,
      };
      await updateStudentAssignmentStatus(student_assignment_id, body);
      toast.success("Status updated");
      loadAssignments();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStudentId(null);
    }
  }

  function openFinishModal(student_assignment_id) {
    setFinishTargetId(student_assignment_id);
    setFinishRemark("");
    setShowFinishModal(true);
  }

  async function confirmFinish() {
    if (!finishTargetId) return setShowFinishModal(false);
    await handleUpdateStudentStatus(finishTargetId, "Finish", finishRemark);
    setShowFinishModal(false);
    setFinishRemark("");
    setFinishTargetId(null);
  }

  function getClassIdFromClassroomId(classroomId) {
    for (const c of classes) {
      if ((c.sections || []).some((s) => String(s.classroom_id) === String(classroomId))) {
        return c.class_id;
      }
    }
    return null;
  }

  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments.filter((a) => {
      const matchesSearch = q
        ? [a.title, a.description, a.class_name, a.section_name]
            .some((f) => String(f || "").toLowerCase().includes(q))
        : true;
      const matchesSection = filterClassroomId
        ? String(a.classroom_id) === String(filterClassroomId)
        : true;
      const classIdForAssignment = getClassIdFromClassroomId(a.classroom_id);
      const matchesClass = filterClassId
        ? String(classIdForAssignment) === String(filterClassId)
        : true;
      return matchesSearch && matchesSection && matchesClass;
    });
  }, [assignments, search, filterClassId, filterClassroomId, classes]);

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
      {/* Page Header - Clean, no dark background */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
        
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Assignments</h1>
        </div>
        <div className="flex gap-1.5 bg-white p-0.5 rounded-lg shadow-sm border border-gray-200 w-full sm:w-auto sm:ml-auto">
          <button
            onClick={() => setActiveTab("add")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex-1 sm:flex-none flex items-center justify-center gap-1.5 ${
              activeTab === "add" 
                ? "bg-[#f86730] text-white shadow-sm" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Plus size={14} />
            Add Assignment
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
            All Assignments
          </button>
        </div>
      </div>

      {activeTab === "add" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Create New Assignment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Create assignments for your students</p>
          </div>

          <form className="p-4" onSubmit={handleCreateAssignment}>
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
                    setForm((f) => ({ ...f, student_ids: [] }));
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
                    setForm((f) => ({ ...f, student_ids: [] }));
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
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Enter assignment title"
                />
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
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition resize-y"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Enter detailed description"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Assignment Level <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition"
                  value={form.assignment_level}
                  onChange={(e) => setForm((f) => ({ ...f, assignment_level: e.target.value, student_ids: [] }))}
                >
                  {levelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {isStudentSelectionRequired && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Select Students <span className="text-red-500">*</span>
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      ({form.assignment_level === "individual" ? "Select 1 student" : "Select 2+ students"})
                    </span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 border rounded-md bg-gray-50">
                    {students.map((s) => {
                      const id = s.student_id;
                      const full = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
                      const checked = form.student_ids.includes(String(id)) || form.student_ids.includes(id);
                      return (
                        <label key={id} className={`flex items-center gap-2 text-xs p-2 rounded border cursor-pointer transition ${
                          checked ? "bg-[#f86730]/10 border-[#f86730]" : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const val = String(id);
                              setForm((f) => {
                                let next = new Set(f.student_ids.map(String));
                                if (e.target.checked) next.add(val);
                                else next.delete(val);
                                if (f.assignment_level === "individual") {
                                  const only = [...next].slice(-1);
                                  next = new Set(only);
                                }
                                return { ...f, student_ids: [...next] };
                              });
                            }}
                          />
                          <span className="truncate">{full}</span>
                        </label>
                      );
                    })}
                    {!students.length && (
                      <div className="text-xs text-gray-500 col-span-full text-center py-4">
                        No students found. Please select a section.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium order-2 sm:order-1"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={!hasBasicForm || (isStudentSelectionRequired && form.student_ids.length === 0) || submitting}
                className={`px-4 py-2 rounded-md text-white font-medium transition text-sm order-1 sm:order-2 ${
                  !hasBasicForm || (isStudentSelectionRequired && form.student_ids.length === 0) || submitting
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
                  "Create Assignment"
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
                <h2 className="text-sm font-semibold text-gray-700">All Assignments</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {filteredAssignments.length > 0 
                    ? `${filteredAssignments.length} assignments found` 
                    : "No assignments"}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition"
                />
                <select
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition"
                  value={filterClassId}
                  onChange={(e) => {
                    setFilterClassId(e.target.value);
                    setFilterClassroomId("");
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
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition disabled:opacity-50"
                  value={filterClassroomId}
                  onChange={(e) => setFilterClassroomId(e.target.value)}
                  disabled={!filterClassId}
                >
                  <option value="">All Sections</option>
                  {(classes.find((c) => String(c.class_id) === String(filterClassId))?.sections || []).map((s) => (
                    <option key={s.classroom_id} value={s.classroom_id}>
                      {s.section_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadAssignments}
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
                <p className="mt-3 text-sm text-gray-500">Loading assignments...</p>
              </div>
            ) : filteredAssignments?.length ? (
              filteredAssignments.map((a) => {
                const isOpen = expanded.has(a.assignment_id);
                return (
                  <div key={a.assignment_id} className="border-t first:border-t-0">
                    <div
                      className="w-full p-4 hover:bg-gray-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                      onClick={() => toggleExpand(a.assignment_id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm md:text-base font-semibold text-gray-800 truncate">{a.title}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {a.assignment_level}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{a.description}</p>
                        <div className="flex flex-wrap gap-3 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <Clock size={12} />
                            Due: {a.due_date}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            {a.class_name} - {a.section_name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <CheckCircle size={12} className="text-green-500" />
                            {a.completed_students}/{a.total_students} completed
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                            {a.completion_percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs border border-gray-300 hover:bg-gray-50 transition bg-white"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(a.assignment_id); }}
                        >
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isOpen ? "Hide" : "View"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(a.assignment_id); }}
                          disabled={deletingId === a.assignment_id}
                          className={`px-3 py-1.5 rounded-md text-xs border transition ${
                            deletingId === a.assignment_id 
                              ? "text-red-300 border-red-200 cursor-not-allowed" 
                              : "text-red-600 border-red-300 hover:bg-red-50"
                          }`}
                        >
                          {deletingId === a.assignment_id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    {isOpen && Array.isArray(a.students) && a.students.length > 0 && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50/50">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700">Student</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700">Admission</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700">Status</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700">Finish Date</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700">Remark</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {a.students.map((s, idx) => (
                                <tr key={s.student_assignment_id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                  <td className="px-3 py-2">{s.first_name} {s.last_name}</td>
                                  <td className="px-3 py-2">{s.admission_number}</td>
                                  <td className="px-3 py-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                      s.assignment_status === "Finish"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    }`}>
                                      {s.assignment_status || "Pending"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">{s.finish_date || "-"}</td>
                                  <td className="px-3 py-2 max-w-[150px] truncate">{s.remark || "-"}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex gap-1.5">
                                      <button
                                        disabled={updatingStudentId === s.student_assignment_id}
                                        onClick={() => handleUpdateStudentStatus(s.student_assignment_id, "Pending")}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition ${
                                          updatingStudentId === s.student_assignment_id 
                                            ? "bg-gray-200 text-gray-500" 
                                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                        }`}
                                      >
                                        Pending
                                      </button>
                                      <button
                                        disabled={updatingStudentId === s.student_assignment_id}
                                        onClick={() => openFinishModal(s.student_assignment_id)}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition ${
                                          updatingStudentId === s.student_assignment_id 
                                            ? "bg-green-300 text-white cursor-not-allowed" 
                                            : "bg-green-600 text-white hover:bg-green-700"
                                        }`}
                                      >
                                        Finish
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">No assignments found</p>
                <p className="text-xs text-gray-500 mt-1">Create your first assignment</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finish Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFinishModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Mark as Finished</h3>
              <button
                onClick={() => setShowFinishModal(false)}
                className="p-1.5 rounded-md hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600">Add a remark for this submission (optional).</p>
            <textarea
              rows={4}
              value={finishRemark}
              onChange={(e) => setFinishRemark(e.target.value)}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition resize-none"
              placeholder="Enter remark (optional)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowFinishModal(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmFinish}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition text-sm font-medium"
              >
                Mark Finish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}