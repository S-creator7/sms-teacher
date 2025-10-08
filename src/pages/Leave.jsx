import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  createEmployeeLeave,
  getEmployeeLeaveList,
  getStudentLeaveList,
  manageStudentLeave,
} from "../Utility/leaveApi";

const leaveTypes = [
  { value: "sick", label: "Sick" },
  { value: "personal", label: "Personal" },
  { value: "vacation", label: "Vacation" },
  { value: "emergency", label: "Emergency" },
];

export default function Leave() {
  const [tab, setTab] = useState("request");

  // New leave request form state
  const [form, setForm] = useState({
    leave_type: "sick",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // My leave history
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Student leaves (for approval)
  const [studentLeaves, setStudentLeaves] = useState([]);
  const [loadingStudentLeaves, setLoadingStudentLeaves] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const hasForm = useMemo(
    () => form.leave_type && form.start_date && form.end_date && form.reason?.trim().length,
    [form]
  );

  useEffect(() => {
    // preload history and student leaves
    refreshHistory();
    refreshStudentLeaves();
  }, []);

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
      toast.success("Leave request submitted");
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
      toast.success(`Student leave ${status.toLowerCase()}`);
      refreshStudentLeaves();
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to ${status.toLowerCase()} leave`);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Leave Management</h1>
      </div>
      <div className="flex gap-2 bg-white p-1 rounded-xl shadow border border-gray-200 w-full sm:w-auto">
        {[
          { key: "request", label: "New Leave" },
          { key: "history", label: "My Leave History" },
          { key: "students", label: "Student Leave Requests" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key
                ? "bg-gray-600 text-white shadow"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "request" && (
  <div className="w-full bg-white rounded-xl shadow-md border border-gray-200 p-8">
    <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={submitLeave}>
      
      {/* Leave Type */}
      <div className="col-span-1">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Leave Type</label>
        <select
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

      {/* Start Date */}
      <div className="col-span-1">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
        <input
          type="date"
          className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={form.start_date}
          onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
        />
      </div>

      {/* End Date */}
      <div className="col-span-1">
        <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
        <input
          type="date"
          className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={form.end_date}
          onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
        />
      </div>

      {/* Reason */}
      <div className="col-span-1 md:col-span-2">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
        <textarea
          rows={4}
          className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
        />
      </div>

      {/* Buttons */}
      <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-4">
        <button
          type="button"
          onClick={() => setForm({ leave_type: "sick", start_date: "", end_date: "", reason: "" })}
          className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={!hasForm || submitting}
          className={`px-5 py-2 rounded-md text-white font-medium transition ${
            !hasForm || submitting
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  </div>
)}


      {tab === "history" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="text-sm text-gray-600">Your past leave applications</div>
            <button
              onClick={refreshHistory}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700">Type</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Start</th>
                  <th className="text-left p-3 font-semibold text-gray-700">End</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Reason</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Remark</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : leaveHistory?.length ? (
                  leaveHistory.map((l) => (
                    <tr key={l.employee_leave_id} className="border-t">
                      <td className="p-3 capitalize">{l.leave_type}</td>
                      <td className="p-3">{l.start_date}</td>
                      <td className="p-3">{l.end_date}</td>
                      <td className="p-3">{l.reason}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            l.leave_status === "Approved"
                              ? "bg-green-100 text-green-700"
                              : l.leave_status === "Rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {l.leave_status || "Pending"}
                        </span>
                      </td>
                      <td className="p-3">{l.remark || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500">
                      No leave history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "students" && (
        <div className="bg-white rounded-xl shadow border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="text-sm text-gray-600">Student leave requests for your classes</div>
            <button
              onClick={refreshStudentLeaves}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700">Student</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Class</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Type</th>
                  <th className="text-left p-3 font-semibold text-gray-700">From</th>
                  <th className="text-left p-3 font-semibold text-gray-700">To</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Reason</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudentLeaves ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : studentLeaves?.length ? (
                  studentLeaves.map((s) => (
                    <tr key={s.student_leave_id} className="border-t">
                      <td className="p-3">
                        {s.first_name} {s.last_name}
                        <div className="text-xs text-gray-500">Adm: {s.admission_number}</div>
                      </td>
                      <td className="p-3">
                        {s.class_name} - {s.section_name}
                      </td>
                      <td className="p-3 capitalize">{s.leave_type}</td>
                      <td className="p-3">{s.start_date}</td>
                      <td className="p-3">{s.end_date}</td>
                      <td className="p-3">{s.reason}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            s.leave_status === "Approved"
                              ? "bg-green-100 text-green-700"
                              : s.leave_status === "Rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {s.leave_status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={actioningId === s.student_leave_id || s.leave_status !== "Pending"}
                            onClick={() => handleStudentLeaveAction(s.student_leave_id, "Approved")}
                            className={`px-3 py-1.5 rounded text-white text-xs ${
                              actioningId === s.student_leave_id || s.leave_status !== "Pending"
                                ? "bg-green-300"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            Approve
                          </button>
                          <button
                            disabled={actioningId === s.student_leave_id || s.leave_status !== "Pending"}
                            onClick={() => handleStudentLeaveAction(s.student_leave_id, "Rejected")}
                            className={`px-3 py-1.5 rounded text-white text-xs ${
                              actioningId === s.student_leave_id || s.leave_status !== "Pending"
                                ? "bg-red-300"
                                : "bg-red-600 hover:bg-red-700"
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
                    <td colSpan={8} className="p-6 text-center text-gray-500">
                      No student leave requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
