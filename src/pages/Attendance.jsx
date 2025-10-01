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
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Attendance</h1>
            <p className="text-xs text-gray-600">View daily student attendance by class</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
            >
              {classrooms.map((c) => (
                <option key={c.classroom_id} value={c.classroom_id}>
                  {c.class_name} • Sec {c.section_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 sm:p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <div className="mb-3 flex items-center justify-between gap-3">
            <input
              placeholder="Search by name or roll no"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-80"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={loadAttendance}
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm"
                disabled={loading}
              >
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
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-sm"
                disabled={loading || filtered.length === 0}
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 border-b">#</th>
                  <th className="text-left px-3 py-2 border-b">Student Id</th>
                  <th className="text-left px-3 py-2 border-b">Student</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">No records</td>
                  </tr>
                ) : (
                  filtered.map((s, idx) => (
                    <tr key={s.student_id || idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-b">{idx + 1}</td>
                      <td className="px-3 py-2 border-b">{s.student_id && s.student_id !== '-' ? s.student_id : '-'}</td>
                      <td className="px-3 py-2 border-b">{`${s.first_name || ""} ${s.last_name || ""}`}</td>
                      <td className="px-3 py-2 border-b">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${s.status === "present" || s.is_present ? "bg-green-100 text-green-700 border-green-200" : s.status === "absent" || s.is_absent ? "bg-red-100 text-red-700 border-red-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
                          {s.status || (s.is_present ? "present" : s.is_absent ? "absent" : "pending")}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-b">{s.remark || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
