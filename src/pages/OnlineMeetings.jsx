import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Video,
  CalendarPlus,
  Users,
  Clock,
  Trash2,
  Edit,
  Copy,
  Check,
  ExternalLink,
  X,
  Calendar,
  Search,
  BookOpen
} from "lucide-react";

import {
  getTeacherClassrooms,
  scheduleMeetingApi,
  listMeetingsApi,
  joinMeetingApi,
  updateMeetingApi,
  deleteMeetingApi,
  getMeetingAttendanceApi
} from "../Utility/onlineMeetingApi";

export default function OnlineMeetings() {
  const [activeTab, setActiveTab] = useState("list");

  // Classrooms mapping
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Create form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit form state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
  });
  const [updating, setUpdating] = useState(false);

  // List & pagination state
  const [meetingsList, setMeetingsList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterClassroomId, setFilterClassroomId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Attendance state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState("");

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Memoized listings for classroom selectors
  const selectedSections = useMemo(() => {
    return classes.find((c) => String(c.class_id) === String(selectedClassId))?.sections || [];
  }, [classes, selectedClassId]);

  const selectedSubjects = useMemo(() => {
    return selectedSections.find((s) => String(s.classroom_id) === String(selectedClassroomId))?.subjectList || [];
  }, [selectedSections, selectedClassroomId]);

  const filterSections = useMemo(() => {
    return classes.find((c) => String(c.class_id) === String(filterClassId))?.sections || [];
  }, [classes, filterClassId]);

  // Form validator helper
  const isFormValid = useMemo(() => {
    return (
      form.title?.trim() &&
      form.start_time &&
      form.end_time &&
      new Date(form.start_time) < new Date(form.end_time)
    );
  }, [form]);

  // Date formatting helpers
  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeOnly = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const toLocalDatetimeString = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const tzoffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Status calculation
  const getMeetingStatus = (start, end) => {
    const now = new Date().getTime();
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (now >= startTime && now <= endTime) {
      return "Live";
    } else if (now < startTime) {
      return "Upcoming";
    } else {
      return "Completed";
    }
  };

  // Fetch Classrooms on Mount
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

  // Fetch Meetings List
  useEffect(() => {
    if (activeTab === "list") {
      fetchMeetings();
    }
  }, [activeTab, currentPage, filterClassroomId, filterStatus]);

  const fetchMeetings = async () => {
    setListLoading(true);
    try {
      const res = await listMeetingsApi({ page: currentPage, limit: 10 });
      const rawMeetings = res?.resources?.data?.meetings || res?.data?.meetings || [];
      const pagination = res?.resources?.data?.pagination || res?.data?.pagination || {};

      // Filter locally for Classroom ID & Status
      let filtered = [...rawMeetings];

      if (filterClassroomId) {
        filtered = filtered.filter(m => String(m.classroom_id) === String(filterClassroomId));
      }

      if (filterStatus) {
        filtered = filtered.filter(m => getMeetingStatus(m.start_time, m.end_time) === filterStatus);
      }

      setMeetingsList(filtered);
      setTotalPages(pagination.total_pages || 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load classroom meetings");
    } finally {
      setListLoading(false);
    }
  };

  // Handle Schedule Submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      };

      if (selectedClassroomId) {
        body.classroom_id = Number(selectedClassroomId);
      }
      if (selectedSubjectId) {
        body.subject_id = Number(selectedSubjectId);
      }

      await scheduleMeetingApi(body);
      toast.success("Classroom meeting scheduled successfully!");
      resetForm();
      setActiveTab("list");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to schedule meeting");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Create Form
  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      start_time: "",
      end_time: "",
    });
    setSelectedClassId("");
    setSelectedClassroomId("");
    setSelectedSubjectId("");
  };

  // Handle Join
  const handleJoinMeeting = async (meeting) => {
    try {
      const res = await joinMeetingApi(meeting.meeting_unique_id);
      const url = res?.resources?.data?.join_url || res?.data?.join_url;
      if (url) {
        window.open(url, "_blank");
        toast.success("Launching classroom meeting...");
      } else {
        toast.error("Unable to find meeting link");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to join meeting");
    }
  };

  // Copy details
  const handleCopyInvite = (meeting) => {
    const timeStr = formatDateTime(meeting.start_time);
    const text = `Classroom Meeting: ${meeting.title}
Class: ${meeting.class_name || ""} - ${meeting.section_name || ""}
Subject: ${meeting.subject_name || ""}
Time: ${timeStr}
Meeting ID: ${meeting.meeting_unique_id}
Please log in to your Aaplishala account to join this virtual class.`;

    navigator.clipboard.writeText(text);
    setCopiedId(meeting.meeting_unique_id);
    toast.success("Meeting details copied!");
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Edit Modal triggers
  const openEditModal = (meeting) => {
    setEditingMeeting(meeting);
    setEditForm({
      title: meeting.title || "",
      description: meeting.description || "",
      start_time: toLocalDatetimeString(meeting.start_time),
      end_time: toLocalDatetimeString(meeting.end_time),
    });
    setShowEditModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title?.trim() || !editForm.start_time || !editForm.end_time) return;

    setUpdating(true);
    try {
      const body = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        start_time: new Date(editForm.start_time).toISOString(),
        end_time: new Date(editForm.end_time).toISOString(),
      };

      await updateMeetingApi(editingMeeting.meeting_unique_id, body);
      toast.success("Classroom meeting updated successfully!");
      setShowEditModal(false);
      fetchMeetings();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update meeting");
    } finally {
      setUpdating(false);
    }
  };

  // Delete Modal triggers
  const openDeleteModal = (meeting) => {
    setMeetingToDelete(meeting);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteMeetingApi(meetingToDelete.meeting_unique_id);
      toast.success("Meeting canceled successfully");
      setShowDeleteModal(false);
      fetchMeetings();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete meeting");
    } finally {
      setDeleting(false);
    }
  };

  // Attendance Report triggers
  const openAttendanceModal = async (meeting) => {
    setSelectedMeeting(meeting);
    setAttendanceLoading(true);
    setShowAttendanceModal(true);
    try {
      const res = await getMeetingAttendanceApi(meeting.meeting_unique_id);
      setAttendanceList(res?.resources?.data || res?.data || []);
    } catch (e) {
      toast.error("Failed to load attendance report");
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Filter list by text query
  const filteredMeetingsList = useMemo(() => {
    if (!searchQuery.trim()) return meetingsList;
    return meetingsList.filter(m =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [meetingsList, searchQuery]);

  return (
    <div className="p-4 md:p-6 space-y-6 font-sans text-base text-black bg-gray-50 min-h-screen">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Video className="w-7 h-7 text-blue-600" />
            Classroom Meetings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule virtual classes, host lecture halls, and trace student attendance reports.
          </p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-full sm:w-auto">
          {[
            { key: "list", label: "All Scheduled Classes" },
            { key: "add", label: "Schedule Class" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex-1 sm:flex-none ${
                activeTab === t.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SCHEDULE CLASS TAB */}
      {activeTab === "add" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-4xl">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-blue-600" />
            Create Virtual Room Schedule
          </h2>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleScheduleSubmit}>
            {/* Select Class */}
            <div className="col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Classroom Grade (Optional)
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedClassroomId("");
                  setSelectedSubjectId("");
                }}
              >
                <option value="">Choose Class Grade</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Section */}
            <div className="col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Section (Optional)
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                value={selectedClassroomId}
                onChange={(e) => {
                  setSelectedClassroomId(e.target.value);
                  setSelectedSubjectId("");
                }}
                disabled={!selectedClassId}
              >
                <option value="">Choose Section</option>
                {selectedSections.map((s) => (
                  <option key={s.classroom_id} value={s.classroom_id}>
                    {s.section_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Subject */}
            <div className="col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Subject (Optional)
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassroomId}
              >
                <option value="">Choose Subject</option>
                {selectedSubjects.map((sbj) => (
                  <option key={sbj.subject_id} value={sbj.subject_id}>
                    {sbj.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden md:block"></div>

            {/* Meeting Title */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Meeting Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="E.g. Grade 10 - Physics Chapter 3 Lecture"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm h-10"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            {/* Start Time */}
            <div className="col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm h-10"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                required
              />
            </div>

            {/* End Time */}
            <div className="col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm h-10"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                required
              />
            </div>

            {/* Description */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Description / Agenda
              </label>
              <textarea
                rows={3}
                placeholder="Details of the lecture, prerequisites, or student instructions..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm transition"
              >
                Reset Details
              </button>
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className={`px-5 py-2.5 rounded-lg text-white font-semibold text-sm shadow-sm transition ${
                  !isFormValid || submitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
                }`}
              >
                {submitting ? "Scheduling..." : "Schedule Classroom Meeting"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ALL SCHEDULED CLASSES TAB */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search class meetings by topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filterClassId}
                onChange={(e) => {
                  setFilterClassId(e.target.value);
                  setFilterClassroomId("");
                }}
              >
                <option value="">All Grade Classes</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {c.class_name}
                  </option>
                ))}
              </select>

              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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

              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Live">Live Rooms</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
              </select>

              <button
                onClick={fetchMeetings}
                className="text-sm px-4 py-2 rounded-lg border border-gray-350 hover:bg-gray-100 text-gray-700 font-semibold"
              >
                Refresh List
              </button>
            </div>
          </div>

          {/* List display */}
          {listLoading ? (
            <div className="bg-white rounded-xl border border-gray-250 py-16 text-center text-gray-500 font-semibold">
              Loading classroom meetings...
            </div>
          ) : filteredMeetingsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeetingsList.map((meeting) => {
                const status = getMeetingStatus(meeting.start_time, meeting.end_time);
                return (
                  <div
                    key={meeting.meeting_unique_id}
                    className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 shadow-sm hover:shadow transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Header info */}
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start gap-2">
                        {meeting.class_name && (
                          <div className="flex items-center gap-1">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              {meeting.class_name} - {meeting.section_name}
                            </span>
                            {meeting.subject_name && (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 flex items-center gap-1">
                                <BookOpen className="w-2.5 h-2.5" />
                                {meeting.subject_name}
                              </span>
                            )}
                          </div>
                        )}
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                            status === "Live"
                              ? "bg-green-150 text-green-700 animate-pulse border-green-200"
                              : status === "Upcoming"
                              ? "bg-blue-105 text-blue-700 border-blue-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {status === "Live" && <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>}
                          {status}
                        </span>
                      </div>

                      {/* Content */}
                      <div>
                        <h3 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {meeting.title}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Host: {meeting.creator_name || "School Teacher"}
                        </p>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2 h-10 overflow-hidden">
                          {meeting.description || "No class syllabus/agenda provided."}
                        </p>
                      </div>

                      {/* Dates */}
                      <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-450" />
                          <span>{formatDateTime(meeting.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-450" />
                          <span>
                            Until {new Date(meeting.end_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {/* Copy invite */}
                        <button
                          onClick={() => handleCopyInvite(meeting)}
                          title="Copy Classroom Invite"
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          {copiedId === meeting.meeting_unique_id ? <Check className="w-4.5 h-4.5 text-green-600" /> : <Copy className="w-4.5 h-4.5" />}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(meeting)}
                          title="Edit Class Schedule"
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>

                        {/* Attendance */}
                        <button
                          onClick={() => openAttendanceModal(meeting)}
                          title="Class Attendance Log"
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        >
                          <Users className="w-4.5 h-4.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => openDeleteModal(meeting)}
                          title="Cancel Class"
                          className="p-1.5 text-gray-500 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      {/* Join button */}
                      <button
                        onClick={() => handleJoinMeeting(meeting)}
                        className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition ${
                          status === "Live"
                            ? "bg-green-600 hover:bg-green-700 text-white hover:shadow-md"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        Join Class
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 px-6 text-center space-y-4 shadow-sm">
              <div className="inline-flex p-4 rounded-full bg-blue-50 text-blue-600">
                <Video className="w-9 h-9" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-gray-800">No classroom meetings scheduled</h3>
                <p className="text-sm text-gray-500">
                  Plan online class rooms, invite student groups, and host remote lectures.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("add")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                Schedule Classroom Session
              </button>
            </div>
          )}
        </div>
      )}

      {/* EDIT CLASS MEETING MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                Edit Class Schedule
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Meeting Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm h-10"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm h-10"
                    value={editForm.start_time}
                    onChange={(e) => setEditForm(prev => ({ ...prev, start_time: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm h-10"
                    value={editForm.end_time}
                    onChange={(e) => setEditForm(prev => ({ ...prev, end_time: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Description / Agenda
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTENDANCE REPORT MODAL */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Classroom Attendance Report
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 font-semibold">
                  Topic: {selectedMeeting?.title}
                </p>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filter Search */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Filter student names..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                />
              </div>
              <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100">
                Joined Count: {attendanceList.length}
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6">
              {attendanceLoading ? (
                <div className="py-12 text-center text-gray-500">Retrieving attendance records...</div>
              ) : attendanceList.filter(u =>
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(attendanceSearch.toLowerCase())
              ).length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Attendee Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Role Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Joined Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Exited Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {attendanceList
                        .filter(u => `${u.first_name} ${u.last_name}`.toLowerCase().includes(attendanceSearch.toLowerCase()))
                        .map((user, idx) => {
                          const meetingEnd = new Date(selectedMeeting?.end_time);
                          const isMeetingOver = new Date().getTime() > meetingEnd.getTime();
                          const join = new Date(user.join_time);
                          const leave = user.leave_time
                            ? new Date(user.leave_time)
                            : (isMeetingOver ? meetingEnd : null);
                          
                          const minutes = leave ? Math.max(0, Math.round((leave.getTime() - join.getTime()) / 60000)) : null;

                          return (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100 uppercase">
                                    {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                                  </div>
                                  <div className="font-semibold text-gray-800">
                                    {user.first_name} {user.last_name}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {(() => {
                                  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
                                  const isHost = fullName === selectedMeeting?.creator_name;
                                  return (
                                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                      isHost ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                    }`}>
                                      {isHost ? "Host / Teacher" : "Student"}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                                {formatTimeOnly(user.join_time)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                                {leave ? formatTimeOnly(leave.toISOString()) : (
                                  <span className="text-green-600 font-bold animate-pulse text-[11px]">Connected</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-semibold text-xs">
                                {leave ? `${minutes} mins` : "Active"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <Users className="w-9 h-9 mx-auto text-gray-300" />
                  <p className="text-sm font-semibold">No attendees found</p>
                  <p className="text-xs text-gray-400">No logs generated yet, or search pattern yields zero results.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-150 flex items-center justify-end bg-gray-50">
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Cancel Classroom Meeting?</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Are you sure you want to cancel and delete <strong>"{meetingToDelete?.title}"</strong>? 
              Students will no longer be able to access the room. This action is irreversible.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4.5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
              >
                Keep Meeting
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
              >
                {deleting ? "Canceling..." : "Cancel Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
