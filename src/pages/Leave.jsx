import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  createEmployeeLeave,
  getEmployeeLeaveList,
  getStudentLeaveList,
  manageStudentLeave,
} from "../Utility/leaveApi";
import { useNavigate } from "react-router-dom";

const leaveTypes = [
  { value: "sick", label: "Sick" },
  { value: "personal", label: "Personal" },
  { value: "vacation", label: "Vacation" },
  { value: "emergency", label: "Emergency" },
];

export default function Leave() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("request");
  const [form, setForm] = useState({
    leave_type: "sick",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [studentLeaves, setStudentLeaves] = useState([]);
  const [loadingStudentLeaves, setLoadingStudentLeaves] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  // Pagination states
  const [historyPage, setHistoryPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const itemsPerPage = 10;

  const hasForm = useMemo(
    () => form.leave_type && form.start_date && form.end_date && form.reason?.trim().length,
    [form]
  );

  // Paginated data for history
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return leaveHistory.slice(start, end);
  }, [leaveHistory, historyPage]);

  // Paginated data for student leaves
  const paginatedStudentLeaves = useMemo(() => {
    const start = (studentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return studentLeaves.slice(start, end);
  }, [studentLeaves, studentPage]);

  // Total pages
  const historyTotalPages = Math.ceil(leaveHistory.length / itemsPerPage);
  const studentTotalPages = Math.ceil(studentLeaves.length / itemsPerPage);

  useEffect(() => {
    refreshHistory();
    refreshStudentLeaves();
  }, []);

  // Reset pages when data changes
  useEffect(() => {
    setHistoryPage(1);
  }, [leaveHistory.length]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentLeaves.length]);

  async function refreshHistory() {
    try {
      setLoadingHistory(true);
      const res = await getEmployeeLeaveList();
      const arr = Array.isArray(res?.resources?.data)
        ? res.resources.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setLeaveHistory(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load leave history");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function refreshStudentLeaves() {
    try {
      setLoadingStudentLeaves(true);
      const res = await getStudentLeaveList();
      const arr = Array.isArray(res?.resources?.data?.leaveList)
        ? res.resources.data.leaveList
        : Array.isArray(res?.resources?.data)
        ? res.resources.data
        : Array.isArray(res?.data?.leaveList)
        ? res.data.leaveList
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setStudentLeaves(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load student leaves");
    } finally {
      setLoadingStudentLeaves(false);
    }
  }

  async function submitLeave(e) {
    e?.preventDefault?.();
    if (!hasForm) return;
    try {
      setSubmitting(true);
      await createEmployeeLeave(form);
      toast.success("Leave request submitted successfully!");
      setForm({ leave_type: "sick", start_date: "", end_date: "", reason: "" });
      setTab("history");
      refreshHistory();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to submit leave");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStudentLeaveAction(id, status) {
    const remark = status === "Rejected" ? prompt("Add remark (optional)") ?? "" : "";
    try {
      setActioningId(id);
      await manageStudentLeave(id, { status, remark });
      toast.success(`Student leave ${status.toLowerCase()} successfully`);
      refreshStudentLeaves();
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${status.toLowerCase()} leave`);
    } finally {
      setActioningId(null);
    }
  }

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Leave Management</h1>
              <p className="text-xs text-gray-500 mt-0.5">Manage your leave requests and student applications</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white p-0.5 rounded-lg shadow-sm border border-gray-200 w-full sm:w-auto">
          {[
            { key: "request", label: "New Leave" },
            { key: "history", label: "My History" },
            { key: "students", label: "Student Requests" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex-1 sm:flex-none ${
                tab === t.key
                  ? "bg-[#f86730] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "request" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Submit Leave Request</h2>
              <p className="text-xs text-gray-500 mt-0.5">Fill in the details to submit a leave request</p>
            </div>
            <form className="p-4" onSubmit={submitLeave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Leave Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
                    value={form.leave_type}
                    onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
                  >
                    {leaveTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition resize-y"
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    placeholder="Enter reason for leave"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setForm({ leave_type: "sick", start_date: "", end_date: "", reason: "" })}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-sm font-medium order-2 sm:order-1"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={!hasForm || submitting}
                  className={`px-4 py-2 rounded-lg text-white font-medium transition text-sm order-1 sm:order-2 ${
                    !hasForm || submitting
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
                      Submitting...
                    </span>
                  ) : (
                    "Submit Leave"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === "history" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">My Leave History</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {leaveHistory.length > 0 
                      ? `${leaveHistory.length} leave applications` 
                      : "Your past leave applications"}
                  </p>
                </div>
                <button
                  onClick={refreshHistory}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition bg-white text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Start</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">End</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#f86730] border-t-transparent"></div>
                        <p className="mt-2">Loading...</p>
                      </td>
                    </tr>
                  ) : paginatedHistory?.length ? (
                    paginatedHistory.map((l) => (
                      <tr key={l.employee_leave_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-4 py-2.5 capitalize font-medium text-gray-800">{l.leave_type}</td>
                        <td className="px-4 py-2.5 text-gray-600">{l.start_date}</td>
                        <td className="px-4 py-2.5 text-gray-600">{l.end_date}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[150px] truncate">{l.reason}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              l.leave_status === "Approved"
                                ? "bg-green-50 text-green-700"
                                : l.leave_status === "Rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            {l.leave_status || "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{l.remark || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No leave history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* History Pagination */}
              {!loadingHistory && leaveHistory.length > 0 && historyTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Showing {((historyPage - 1) * itemsPerPage) + 1} to{' '}
                    {Math.min(historyPage * itemsPerPage, leaveHistory.length)} of {leaveHistory.length}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                      disabled={historyPage === 1}
                      className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition bg-white text-gray-600"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-xs text-gray-500">
                      Page {historyPage} of {historyTotalPages}
                    </span>
                    <button
                      onClick={() => setHistoryPage(prev => Math.min(prev + 1, historyTotalPages))}
                      disabled={historyPage === historyTotalPages}
                      className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition bg-white text-gray-600"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "students" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Student Leave Requests</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {studentLeaves.length > 0 
                      ? `${studentLeaves.length} student requests` 
                      : "Student leave requests for your classes"}
                  </p>
                </div>
                <button
                  onClick={refreshStudentLeaves}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition bg-white text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">From</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">To</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStudentLeaves ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#f86730] border-t-transparent"></div>
                        <p className="mt-2">Loading...</p>
                      </td>
                    </tr>
                  ) : paginatedStudentLeaves?.length ? (
                    paginatedStudentLeaves.map((s) => (
                      <tr key={s.student_leave_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-800">
                            {s.first_name} {s.last_name}
                          </div>
                          <div className="text-xs text-gray-500">Adm: {s.admission_number}</div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {s.class_name} - {s.section_name}
                        </td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{s.leave_type}</td>
                        <td className="px-4 py-2.5 text-gray-600">{s.start_date}</td>
                        <td className="px-4 py-2.5 text-gray-600">{s.end_date}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[120px] truncate">{s.reason}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              s.leave_status === "Approved"
                                ? "bg-green-50 text-green-700"
                                : s.leave_status === "Rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            {s.leave_status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5">
                            <button
                              disabled={actioningId === s.student_leave_id || s.leave_status !== "Pending"}
                              onClick={() => handleStudentLeaveAction(s.student_leave_id, "Approved")}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                                actioningId === s.student_leave_id || s.leave_status !== "Pending"
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              Approve
                            </button>
                            <button
                              disabled={actioningId === s.student_leave_id || s.leave_status !== "Pending"}
                              onClick={() => handleStudentLeaveAction(s.student_leave_id, "Rejected")}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                                actioningId === s.student_leave_id || s.leave_status !== "Pending"
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-red-50 text-red-700 hover:bg-red-100"
                              }`}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No student leave requests
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Student Leaves Pagination */}
              {!loadingStudentLeaves && studentLeaves.length > 0 && studentTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Showing {((studentPage - 1) * itemsPerPage) + 1} to{' '}
                    {Math.min(studentPage * itemsPerPage, studentLeaves.length)} of {studentLeaves.length}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setStudentPage(prev => Math.max(prev - 1, 1))}
                      disabled={studentPage === 1}
                      className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition bg-white text-gray-600"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-xs text-gray-500">
                      Page {studentPage} of {studentTotalPages}
                    </span>
                    <button
                      onClick={() => setStudentPage(prev => Math.min(prev + 1, studentTotalPages))}
                      disabled={studentPage === studentTotalPages}
                      className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition bg-white text-gray-600"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}