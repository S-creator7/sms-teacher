import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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
