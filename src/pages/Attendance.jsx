import { useContext, useEffect, useMemo, useState } from "react";
import { getTeacherClassrooms, getAttendanceByClassroom, postClassAttendance, updateStudentAttendance } from "../Utility/attendanceApi";
import { exportStudentAttendance, exportSingleStudentAttendance } from "../Utility/exportApi";
import { getClassroomStudents } from "../Utility/assignmentApi";
import { UserContext } from "../components/Provider";
import { toast } from "react-toastify";

function formatDateISO(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Attendance() {
  const { profile } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [classrooms, setClassrooms] = useState([]);
  const [groupedClasses, setGroupedClasses] = useState([]);

  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");

  // For taking attendance
  const [editable, setEditable] = useState(false);
  const [editRows, setEditRows] = useState([]); // {student_id, name, status, remark}
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [expClassId, setExpClassId] = useState("");
  const [expClassroomId, setExpClassroomId] = useState("");
  const [expStartDate, setExpStartDate] = useState(formatDateISO(new Date(new Date().setDate(new Date().getDate() - 7))));
  const [expEndDate, setExpEndDate] = useState(formatDateISO(new Date()));
  const [exporting, setExporting] = useState(false);
  const [exportStudents, setExportStudents] = useState([]); // students listed for individual export

  // Inline edit a single existing attendance record
  const [rowEditingId, setRowEditingId] = useState(null);
  const [rowEditStatus, setRowEditStatus] = useState("Present");
  const [rowEditRemark, setRowEditRemark] = useState("");

  const filtered = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter((s) =>
      `${s.roll_no || ""} ${s.first_name || ""} ${s.middle_name || ""} ${s.last_name || ""}`
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .includes(q)
    );
  }, [students, search]);

  const isFutureSelected = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const sel = new Date(date);
    sel.setHours(0,0,0,0);
    return sel.getTime() > today.getTime();
  }, [date]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getTeacherClassrooms();
        const data = Array.isArray(res?.resources?.data)
          ? res.resources.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        const flat = [];
        data.forEach((cls) => {
          const className = cls?.class_name;
          (cls?.sections || []).forEach((sec) => {
            flat.push({
              classroom_id: sec.classroom_id,
              class_name: className,
              section_name: sec.section_name,
            });
          });
        });
        if (!mounted) return;
        setGroupedClasses(data);
        setClassrooms(flat);
        if (flat.length && !selectedClassroom) {
          setSelectedClassroom(flat[0].classroom_id);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e.message || "Failed to load classrooms");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadAttendance() {
    if (!profile?.today_attendance?.is_attendance_marked) return;
    if (!selectedClassroom) return;
    try {
      setLoading(true);
      setError("");
      if (isFutureSelected) {
        toast.warn("You are viewing a future date. Submitting will mark attendance in advance.");
      }
      const res = await getAttendanceByClassroom(selectedClassroom, date);
      const list = Array.isArray(res?.resources?.data)
        ? res.resources.data
        : Array.isArray(res?.data)
          ? res.data
          : [];
      const rows = list.map((r) => {
        const status = r.attendance_status || r.status || "pending";
        return {
          attendance_id: r.student_attendance_id || r.attendance_id || r.id,
          student_id: r.student_id,
          roll_no: r.roll_no || r.roll_number || r.student_roll_no || r.rollno || r.roll || "-",
          first_name: r.first_name || "",
          middle_name: r.middle_name || "",
          last_name: r.last_name || "",
          status,
          is_present: /present/i.test(status),
          is_absent: /absent/i.test(status),
          remark: r.remark ?? "-",
        };
      });
      setStudents(rows);

      // If no attendance exists for the selected date/classroom, load roster for taking attendance
      if (rows.length === 0 && profile?.today_attendance?.is_attendance_marked) {
        try {
          const r = await getClassroomStudents(selectedClassroom);
          const data = Array.isArray(r?.resources?.data)
            ? r.resources.data
            : Array.isArray(r?.data)
              ? r.data
              : [];
          const defaults = data.map((s) => ({
            student_id: s.student_id,
            roll_no: s.roll_number || s.roll_no || "-",
            name: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" "),
            status: "Present",
            remark: "",
          }));
          setEditRows(defaults);
          setEditable(true);
        } catch {
          setEditable(false);
          setEditRows([]);
        }
      } else {
        setEditable(false);
        setEditRows([]);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, [selectedClassroom, date]);

  async function openExportModal() {
    if (!profile?.today_attendance?.is_attendance_marked) return;
    let defaultClassId = expClassId;
    let defaultClassroomId = expClassroomId;

    if (selectedClassroom) {
      const ownerClass = groupedClasses.find((gc) =>
        (gc.sections || []).some((s) => String(s.classroom_id) === String(selectedClassroom))
      );
      if (ownerClass) defaultClassId = String(ownerClass.class_id);
      defaultClassroomId = String(selectedClassroom);
    } else if (groupedClasses.length) {
      defaultClassId = String(groupedClasses[0].class_id);
      defaultClassroomId = String(groupedClasses[0]?.sections?.[0]?.classroom_id || "");
    }

    setExpClassId(defaultClassId || "");
    setExpClassroomId(defaultClassroomId || "");

    if (defaultClassroomId) {
      try {
        const res = await getClassroomStudents(defaultClassroomId);
        const data = Array.isArray(res?.resources?.data)
          ? res.resources.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        setExportStudents(data);
      } catch {
        setExportStudents([]);
      }
    } else {
      setExportStudents([]);
    }

    setShowExport(true);
  }

  useEffect(() => {
    if (showExport) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showExport]);

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Attendance</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage daily student attendance records</p>
        </div>

        {!profile?.today_attendance?.is_attendance_marked && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
            <div className="font-semibold mb-1">Action required</div>
            <div className="mb-2">You must Login for the day before accessing student attendance.</div>
            <a href="/my-attendance" className="inline-block px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700">Go to My Attendance</a>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-800">Attendance Records</h2>
                <p className="text-sm text-gray-500">Select class and date to view attendance</p>
                {isFutureSelected && (
                  <div className="mt-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
                    You are marking attendance for a future date. Please confirm before submitting.
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Class & Section</label>
                  <select
                    className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm min-w-[220px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={selectedClassroom}
                    onChange={(e) => setSelectedClassroom(e.target.value)}
                    disabled={!profile?.today_attendance?.is_attendance_marked}
                  >
                    {classrooms.map((c) => (
                      <option key={c.classroom_id} value={c.classroom_id}>
                        {c.class_name} • Section {c.section_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={!profile?.today_attendance?.is_attendance_marked}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="relative max-w-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    placeholder="Search students by name or roll number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 border border-gray-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={!profile?.today_attendance?.is_attendance_marked}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadAttendance}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>

                <button
                  onClick={openExportModal}
                  className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  disabled={!profile?.today_attendance?.is_attendance_marked}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8" />
                  </svg>
                  Fetch Attendance
                </button>
              </div>
            </div>

            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Student ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Student Name
                      </th>
                      {editable ? (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Remark</th>
                        </>
                      ) : (
                        <>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Remarks</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      [...Array(8)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-6"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-gray-200 rounded w-20"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                          </td>
                        </tr>
                      ))
                    ) : (!editable && filtered.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                              />
                            </svg>
                            <p className="text-sm font-medium">No attendance records found</p>
                            <p className="text-xs mt-1">Try selecting a different date or class</p>
                          </div>
                        </td>
                      </tr>
                    ) : editable ? (
                      (editRows || []).filter((s) => `${s.roll_no || ""} ${s.name || ""}`.toLowerCase().includes(search.toLowerCase())).map((s, idx) => (
                        <tr key={s.student_id || idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{s.student_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              {['Present','Absent','Late'].map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => setEditRows((rows) => rows.map((r) => r.student_id === s.student_id ? { ...r, status: opt } : r))}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${s.status === opt ? (opt==='Present' ? 'bg-green-600 text-white border-green-700' : opt==='Absent' ? 'bg-red-600 text-white border-red-700' : 'bg-yellow-500 text-white border-yellow-600') : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            <input
                              value={s.remark || ''}
                              onChange={(e) => setEditRows((rows) => rows.map((r) => r.student_id === s.student_id ? { ...r, remark: e.target.value } : r))}
                              placeholder="Optional remark"
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      filtered.map((s, idx) => (
                        <tr key={s.student_id || idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {s.student_id && s.student_id !== "-" ? s.student_id : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {`${s.first_name || ""} ${s.middle_name || ""} ${s.last_name || ""}`.replace(/\s+/g, " ").trim() || "-"}
                          </td>
                          {rowEditingId === s.attendance_id ? (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  {['Present','Absent','Late'].map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => setRowEditStatus(opt)}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${rowEditStatus === opt ? (opt==='Present' ? 'bg-green-600 text-white border-green-700' : opt==='Absent' ? 'bg-red-600 text-white border-red-700' : 'bg-yellow-500 text-white border-yellow-600') : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs">
                                <input
                                  value={rowEditRemark}
                                  onChange={(e) => setRowEditRemark(e.target.value)}
                                  placeholder="Optional remark"
                                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await updateStudentAttendance(s.attendance_id, { attendance_status: rowEditStatus, remark: rowEditRemark ?? "" });
                                        toast.success(res?.message || 'Updated');
                                        setRowEditingId(null);
                                        await loadAttendance();
                                      } catch (e) {
                                        toast.error(e?.response?.data?.message || e?.message || 'Update failed');
                                      }
                                    }}
                                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setRowEditingId(null)}
                                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${/present/i.test(s.status) || s.is_present
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : /absent/i.test(s.status) || s.is_absent
                                      ? "bg-red-100 text-red-800 border border-red-200"
                                      : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                    }`}
                                >
                                  {s.status || (s.is_present ? "Present" : s.is_absent ? "Absent" : "Late")}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate">
                                {s.remark || "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {profile?.today_attendance?.is_attendance_marked && (
                                  <button
                                    onClick={() => {
                                      setRowEditingId(s.attendance_id);
                                      setRowEditStatus(/present|absent|late/i.test(s.status) ? s.status.replace(/\b\w/g, c => c.toUpperCase()) : 'Present');
                                      setRowEditRemark(s.remark && s.remark !== '-' ? s.remark : '');
                                    }}
                                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                  >
                                    Edit
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Controls for taking attendance */}
            {editable && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">Mark all:</span>
                  {['Present','Absent','Late'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setEditRows((rows) => rows.map((r) => ({ ...r, status: opt })))}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border ${opt==='Present' ? 'bg-green-600 text-white border-green-700' : opt==='Absent' ? 'bg-red-600 text-white border-red-700' : 'bg-yellow-500 text-white border-yellow-600'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Comments (optional)</label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any overall comments for today's attendance"
                  />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setEditable(false)}
                    className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedClassroom) return;
                      try {
                        setSubmitting(true);
                        const payload = {
                          attendance_date: date,
                          attendance: editRows.map((r) => ({ student_id: r.student_id, attendance_status: r.status, remark: r.remark ?? "" })),
                          comments: comments || undefined,
                        };
                        const res = await postClassAttendance(selectedClassroom, payload);
                        toast.success(res?.message || "Attendance submitted");
                        setEditable(false);
                        setEditRows([]);
                        setComments("");
                        await loadAttendance();
                      } catch (e) {
                        toast.error(e?.response?.data?.message || e?.message || "Failed to submit attendance");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting || editRows.length === 0}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold shadow ${submitting ? 'bg-gray-400 text-gray-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {submitting ? 'Submitting...' : 'Submit Attendance'}
                  </button>
                </div>
              </div>
            )}

            {/* Footer info for view mode */}
            {!loading && !editable && filtered.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div>
                  Showing <span className="font-medium">{filtered.length}</span> of{" "}
                  <span className="font-medium">{students.length}</span> students
                </div>
                <div className="text-xs">Last updated: {new Date().toLocaleTimeString()}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowExport(false)} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 px-6 py-4 bg-white rounded-t-2xl flex items-center justify-between shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800">Export Attendance</h3>
              <button onClick={() => setShowExport(false)} className="p-2 rounded hover:bg-gray-100">
                ✕
              </button>
            </div>

            <div className="flex-1 p-5 space-y-4 overflow-y-auto modal-scroll">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-start">
                {/* Select Class */}
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={expClassId}
                  onChange={(e) => {
                    setExpClassId(e.target.value);
                    setExpClassroomId("");
                    setExportStudents([]);
                  }}
                >
                  <option value="">Select Class</option>
                  {groupedClasses.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>

                {/* Select Section */}
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={expClassroomId}
                  onChange={async (e) => {
                    const crId = e.target.value;
                    setExpClassroomId(crId);
                    if (crId) {
                      try {
                        const res = await getClassroomStudents(crId);
                        const data = Array.isArray(res?.resources?.data)
                          ? res.resources.data
                          : Array.isArray(res?.data)
                            ? res.data
                            : [];
                        setExportStudents(data);
                      } catch {
                        setExportStudents([]);
                      }
                    } else setExportStudents([]);
                  }}
                  disabled={!expClassId}
                >
                  <option value="">Select Section</option>
                  {(groupedClasses.find((c) => String(c.class_id) === String(expClassId))?.sections || []).map(
                    (s) => (
                      <option key={s.classroom_id} value={s.classroom_id}>
                        {s.section_name}
                      </option>
                    )
                  )}
                </select>

                {/* Start Date */}
                <input
                  type="date"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={expStartDate}
                  onChange={(e) => setExpStartDate(e.target.value)}
                />

                {/* End Date */}
                <input
                  type="date"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={expEndDate}
                  onChange={(e) => setExpEndDate(e.target.value)}
                />

                {/* Export Button */}
                <button
                  onClick={async () => {
                    if (!expStartDate || !expEndDate || !expClassroomId) return;
                    try {
                      setExporting(true);
                      const res = await exportStudentAttendance({
                        start_date: expStartDate,
                        end_date: expEndDate,
                        classroom_id: expClassroomId,
                        class_id: expClassId || undefined,
                      });
                      const blob = new Blob([res.data], {
                        type: res.headers["content-type"] || "application/octet-stream",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `attendance_${expClassId || "class"}_${expClassroomId || "section"}_${expStartDate}_to_${expEndDate}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={!expStartDate || !expEndDate || !expClassroomId || exporting}
                  className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow ${!expStartDate || !expEndDate || !expClassroomId || exporting
                      ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                      : "bg-gray-800 text-white hover:bg-gray-900"
                    }`}
                >
                  Export All
                </button>
              </div>

              <div className="rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-800">Student Name</th>
                        <th className="text-left p-3 font-semibold text-gray-800">Student Id</th>
                        <th className="text-left p-3 font-semibold text-gray-800">Class</th>
                        <th className="text-left p-3 font-semibold text-gray-800">Section</th>
                        <th className="text-left p-3 font-semibold text-gray-800">Roll No.</th>
                        <th className="text-left p-3 font-semibold text-gray-800">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportStudents.length === 0 ? (
                        <tr>
                          <td className="p-6 text-center text-gray-500" colSpan={6}>
                            No attendance found
                          </td>
                        </tr>
                      ) : (
                        exportStudents.map((st) => (
                          <tr key={st.student_id} className="odd:bg-white even:bg-gray-200 hover:bg-gray-100">
                            <td className="p-3">{[st.first_name, st.middle_name, st.last_name].filter(Boolean).join(" ")}</td>
                            <td className="p-3">{st.student_id}</td>
                            <td className="p-3">
                              {(
                                groupedClasses.find((c) =>
                                  (c.sections || []).some((s) => String(s.classroom_id) === String(expClassroomId))
                                ) || {}
                              ).class_name || "-"}
                            </td>
                            <td className="p-3">
                              {(
                                (groupedClasses.find((c) => String(c.class_id) === String(expClassId))?.sections || []).find(
                                  (s) => String(s.classroom_id) === String(expClassroomId)
                                ) || {}
                              ).section_name || "-"}
                            </td>
                            <td className="p-3">{st.roll_number || st.roll_no || "-"}</td>
                            <td className="p-3">
                              <button
                                onClick={async () => {
                                  if (!expStartDate || !expEndDate) return;
                                  try {
                                    setExporting(true);
                                    const res = await exportSingleStudentAttendance(st.student_id, {
                                      start_date: expStartDate,
                                      end_date: expEndDate,
                                    });
                                    const blob = new Blob([res.data], {
                                      type: res.headers["content-type"] || "application/octet-stream",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `attendance_student_${st.student_id}_${expStartDate}_to_${expEndDate}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  } catch (e) {
                                    console.error(e);
                                  } finally {
                                    setExporting(false);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg border border-indigo-200 text-sm text-indigo-700 hover:bg-indigo-50"
                              >
                                Export
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
        </div>
      )}
    </div>
  );
}