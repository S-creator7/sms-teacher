import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET /v1/teacher/classrooms
export async function getTeacherClassrooms() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/classrooms`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

// GET /v1/teacher/student-list/:classroom_id
export async function getClassroomStudents(classroom_id) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/student-list/${classroom_id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// POST /v1/teacher/create-assignment
export async function createAssignment(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/create-assignment`,
    body,
    {
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    }
  );
  return res.data;
}

// GET /v1/teacher/assignments?classroom_id=
export async function getAssignmentsList(params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/assignments`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data;
}

export async function deleteAssignment(assignment_id) {
  const res = await axios.delete(
    `${API_ENDPOINT}/v1/teacher/assignments/${assignment_id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function updateStudentAssignmentStatus(student_assignment_id, body) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/assignments/student/${student_assignment_id}`,
    body,
    {
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    }
  );
  return res.data;
}
