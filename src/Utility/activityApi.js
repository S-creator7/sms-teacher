import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getClassActivityList() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/class-activities`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getClassroomActivities(classroomId) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/classroom-activities/${classroomId}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getStudentActivities(studentId) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/student-activities/${studentId}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}
