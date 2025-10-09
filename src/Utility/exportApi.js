import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET /v1/school-admin/school/export-student-attendance
export async function exportStudentAttendance(params) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/school-admin/school/export-student-attendance`,
    {
      headers: getAuthHeaders(),
      params,
      responseType: "blob",
    }
  );
  return res;
}

// GET /v1/school-admin/school/export-student-attendance/:student_id
export async function exportSingleStudentAttendance(student_id, params) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/school-admin/school/export-student-attendance/${student_id}`,
    {
      headers: getAuthHeaders(),
      params,
      responseType: "blob",
    }
  );
  return res;
}