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

const levelOptions = [
  { value: "classroom", label: "Classroom" },
  { value: "group", label: "Group" },
  { value: "individual", label: "Individual" },
];

export default function Assignments() {
  const [activeTab, setActiveTab] = useState("add");

  // Classrooms and Students
  const [classes, setClasses] = useState([]); // [{class_id, class_name, sections:[{section_id, section_name, classroom_id}] }]
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [students, setStudents] = useState([]); // from selected classroom

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

  // Auto refresh assignments when section filter changes
  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.success("Assignment created");
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

  // Helper to derive class_id from assignment.classroom_id via classes -> sections mapping
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
      // Search filter
      const matchesSearch = q
        ? [a.title, a.description, a.class_name, a.section_name]
            .some((f) => String(f || "").toLowerCase().includes(q))
        : true;

      // Section filter (server already narrowed if provided, but also guard here)
      const matchesSection = filterClassroomId
        ? String(a.classroom_id) === String(filterClassroomId)
        : true;

      // Class filter via mapping
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

  return (
    <div className="p-4 md:p-6 space-y-6 font-sans text-base text-black">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow border border-gray-200 w-full sm:w-auto">
          {[
            { key: "add", label: "Add Assignment" },
            { key: "all", label: "All Assignments" },
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
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleCreateAssignment}>
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Class</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedClassroomId("");
                  setForm((f) => ({ ...f, student_ids: [] }));
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
                  setForm((f) => ({ ...f, student_ids: [] }));
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Enter assignment title"
              />
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                rows={4}
                className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Enter description"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Assignment Level</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Students</label>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-auto p-3 border rounded-md bg-gray-50">
                  {students.map((s) => {
                    const id = s.student_id;
                    const full = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
                    const checked = form.student_ids.includes(String(id)) || form.student_ids.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-2 text-sm bg-white p-2 rounded border">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const val = String(id);
                            setForm((f) => {
                              let next = new Set(f.student_ids.map(String));
                              if (e.target.checked) next.add(val);
                              else next.delete(val);
                              // Enforce exactly one for individual
                              if (f.assignment_level === "individual") {
                                const only = [...next].slice(-1);
                                next = new Set(only);
                              }
                              return { ...f, student_ids: [...next] };
                            });
                          }}
                        />
                        <span>{full} ({s.admission_number})</span>
                      </label>
                    );
                  })}
                  {!students.length && (
                    <div className="text-sm text-gray-500">No students loaded.</div>
                  )}
                </div>
              </div>
            )}

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
                disabled={!hasBasicForm || (isStudentSelectionRequired && form.student_ids.length === 0) || submitting}
                className={`px-5 py-2 rounded-md text-white font-medium transition ${
                  !hasBasicForm || (isStudentSelectionRequired && form.student_ids.length === 0) || submitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? "Submitting..." : "Create Assignment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "all" && (
        <div className="bg-white rounded-2xl shadow">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4">
            <div className="text-sm text-gray-600">All assignments you created</div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Search by title, description, class, section..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
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
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
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
                className="text-sm px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                Refresh
              </button>
            </div>
          </div>

          <div>
            {listLoading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : filteredAssignments?.length ? (
              filteredAssignments.map((a) => {
                const isOpen = expanded.has(a.assignment_id);
                return (
                  <div key={a.assignment_id} className="divide-y">
                    <button
                      onClick={() => toggleExpand(a.assignment_id)}
                      className="w-full text-left p-4 hover:bg-gray-50 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base md:text-lg font-semibold text-gray-800">{a.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border">{a.assignment_level}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">{a.description}</div>
                        <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
                          <span>Due: {a.due_date}</span>
                          <span>Class: {a.class_name} - {a.section_name}</span>
                          <span>
                            Completed: <span className="font-semibold">{a.completed_students}/{a.total_students}</span>
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{a.completion_percentage}%</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-md text-xs border ${isOpen ? "bg-gray-100" : "bg-white hover:bg-gray-50"} border-gray-300 text-gray-700`}
                        >
                          {isOpen ? "Hide" : "View"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(a.assignment_id); }}
                          disabled={deletingId === a.assignment_id}
                          className={`px-3 py-1.5 rounded-md text-xs border ${
                            deletingId === a.assignment_id ? "text-red-300 border-red-200" : "text-red-600 border-red-300 hover:bg-red-50"
                          }`}
                        >
                          {deletingId === a.assignment_id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </button>

                    {isOpen && Array.isArray(a.students) && a.students.length > 0 && (
                      <div className="px-4 pb-6">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-base font-sans">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left p-2 font-semibold text-gray-800">Student</th>
                                <th className="text-left p-2 font-semibold text-gray-800">Admission</th>
                                <th className="text-left p-2 font-semibold text-gray-800">Status</th>
                                <th className="text-left p-2 font-semibold text-gray-800">Finish Date</th>
                                <th className="text-left p-2 font-semibold text-gray-800">Remark</th>
                                <th className="text-left p-2 font-semibold text-gray-800">Action</th>
                              </tr>
                            </thead>
                            <tbody className="[&>tr]:transition-colors">
                              {a.students.map((s, idx) => (
                                <tr key={s.student_assignment_id} className={idx % 2 === 1 ? "bg-gray-50" : "bg-white"}>
                                  <td className="p-2">{[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ")}</td>
                                  <td className="p-2">{s.admission_number}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      s.assignment_status === "Finish"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}>
                                      {s.assignment_status || "Pending"}
                                    </span>
                                  </td>
                                  <td className="p-2">{s.finish_date || "-"}</td>
                                  <td className="p-2">{s.remark || "-"}</td>
                                  <td className="p-2">
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        disabled={updatingStudentId === s.student_assignment_id}
                                        onClick={() => handleUpdateStudentStatus(s.student_assignment_id, "Pending")}
                                        className={`px-3 py-1 rounded-md text-xs border ${
                                          updatingStudentId === s.student_assignment_id ? "bg-gray-200" : "bg-white hover:bg-gray-50"
                                        }`}
                                      >
                                        Pending
                                      </button>
                                      <button
                                        disabled={updatingStudentId === s.student_assignment_id}
                                        onClick={() => openFinishModal(s.student_assignment_id)}
                                        className={`px-3 py-1 rounded-md text-xs ${
                                          updatingStudentId === s.student_assignment_id ? "bg-green-300 text-white" : "bg-green-600 text-white hover:bg-green-700"
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
              <div className="p-6 text-center text-gray-500">No assignments found</div>
            )}
          </div>
        </div>
      )}

      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFinishModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800">Mark as Finished</h3>
            <p className="text-sm text-gray-600 mt-1">Optionally add a remark for this submission.</p>
            <textarea
              rows={4}
              value={finishRemark}
              onChange={(e) => setFinishRemark(e.target.value)}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter remark (optional)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowFinishModal(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmFinish}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm"
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
