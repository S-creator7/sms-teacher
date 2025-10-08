import { useEffect, useMemo, useState } from "react";
import { getTeacherClassrooms, getAttendanceByClassroom } from "../Utility/attendanceApi";

function formatDateISO(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Attendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter((s) =>
      `${s.roll_no || ""} ${s.first_name || ""} ${s.last_name || ""}`.toLowerCase().includes(q)
    );
  }, [students, search]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getTeacherClassrooms();
        const raw = res?.resources?.data || [];
        const flat = [];
        raw.forEach((cls) => {
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
        setClassrooms(flat);
        if (flat.length && !selectedClassroom) {
          setSelectedClassroom(flat[0].classroom_id);
        }
      } catch (e) {
        setError(e?.response?.data?.message || e.message || "Failed to load classrooms");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function loadAttendance() {
    if (!selectedClassroom) return;
    try {
      setLoading(true);
      setError("");
      const res = await getAttendanceByClassroom(selectedClassroom, date);
      const rows = (res?.resources?.data || []).map((r) => {
        const status = r.attendance_status || r.status || "pending";
        return {
          student_id: r.student_id,
          roll_no: r.roll_no || r.roll_number || r.student_roll_no || r.rollno || r.roll || "-",
          first_name: r.first_name || "",
          last_name: r.last_name || r.middle_name || "",
          status,
          is_present: /present/i.test(status),
          is_absent: /absent/i.test(status),
          remark: r.remark ?? "-",
        };
      });
      setStudents(rows);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, [selectedClassroom, date]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Attendance</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage daily student attendance records</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-800">Attendance Records</h2>
                <p className="text-sm text-gray-500">Select class and date to view attendance</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Class & Section</label>
                  <select
                    className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm min-w-[220px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={selectedClassroom}
                    onChange={(e) => setSelectedClassroom(e.target.value)}
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
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="relative max-w-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    placeholder="Search students by name or roll number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 border border-gray-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={loadAttendance}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                
                <button
                  onClick={() => {
                    const current = classrooms.find(c => String(c.classroom_id) === String(selectedClassroom));
                    const header = [
                      "Student Id",
                      "Student",
                      "Status",
                      "Remarks",
                      "Date",
                      "Class",
                      "Section",
                    ];
                    const rows = filtered.map((s, i) => [
                      s.student_id && s.student_id !== '-' ? s.student_id : i + 1,
                      `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                      s.status,
                      s.remark || '-',
                      date,
                      current?.class_name || '',
                      current?.section_name || '',
                    ]);
                    const csv = [header, ...rows]
                      .map(r => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(","))
                      .join("\n");
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `attendance_${current?.class_name || 'class'}_${current?.section_name || 'section'}_${date}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  disabled={loading || filtered.length === 0}
                  className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Remarks</th>
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
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            <p className="text-sm font-medium">No attendance records found</p>
                            <p className="text-xs mt-1">Try selecting a different date or class</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((s, idx) => (
                        <tr key={s.student_id || idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {s.student_id && s.student_id !== '-' ? s.student_id : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {`${s.first_name || ""} ${s.last_name || ""}`.trim() || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              s.status === "present" || s.is_present 
                                ? "bg-green-100 text-green-800 border border-green-200" 
                                : s.status === "absent" || s.is_absent 
                                ? "bg-red-100 text-red-800 border border-red-200" 
                                : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            }`}>
                              {s.status || (s.is_present ? "present" : s.is_absent ? "absent" : "pending")}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate">
                            {s.remark || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {!loading && filtered.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div>
                  Showing <span className="font-medium">{filtered.length}</span> of <span className="font-medium">{students.length}</span> students
                </div>
                <div className="text-xs">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}