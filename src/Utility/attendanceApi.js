import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Update a single student's attendance record
// body: { status: 'Present'|'Absent'|'Late'|'Half Day', remark?: string }
export async function updateStudentAttendance(studentAttendanceId, body) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/attendance/${studentAttendanceId}`,
    body,
    { headers: { "Content-Type": "application/json", ...getAuthHeaders() } }
  );
  return res.data;
}

export async function getTeacherClassrooms() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/classrooms`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getAttendanceByClassroom(classroom_id, date) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/attendance/${classroom_id}`, {
    headers: getAuthHeaders(),
    params: { date },
  });
  return res.data;
}

// Mark or update today's teacher attendance (Login/Logout)
// Backend expects: { latitude: number, longitude: number }
export async function markTeacherAttendance({ latitude, longitude }) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/attendance`,
    { latitude, longitude },
    { headers: { "Content-Type": "application/json", ...getAuthHeaders() } }
  );
  return res.data;
}

// Fetch teacher attendance history within a date range
export async function getTeacherAttendanceHistory({ from_date, to_date }) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/attendance-history`, {
    headers: getAuthHeaders(),
    params: { from_date, to_date },
  });
  return res.data;
}

// Submit student attendance for a classroom
// body: { attendance_date: 'YYYY-MM-DD', attendance: [{ student_id, status, remark? }], comments? }
export async function postClassAttendance(classroom_id, body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/attendance/${classroom_id}`,
    body,
    { headers: { "Content-Type": "application/json", ...getAuthHeaders() } }
  );
  return res.data;
}

