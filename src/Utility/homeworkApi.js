import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET /v1/teacher/classrooms (reused to populate class/section/subject lists)
export async function getTeacherClassrooms() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/classrooms`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

// POST /v1/teacher/homework/:classRoomId
export async function createHomework(classRoomId, body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/homework/${classRoomId}`,
    body,
    { headers: { ...getAuthHeaders(), "Content-Type": "application/json" } }
  );
  return res.data;
}

// GET /v1/teacher/homewrok/:classRoomId  (note: backend route has a typo: 'homewrok')
export async function getClassroomHomework(classRoomId) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/homewrok/${classRoomId}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}
