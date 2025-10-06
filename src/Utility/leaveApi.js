import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Teacher: Create new leave request
export async function createEmployeeLeave(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/employee-leave`,
    body,
    {
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    }
  );
  return res.data;
}

// Teacher: Fetch own leave history
export async function getEmployeeLeaveList() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/employee-leave-list`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

// Teacher: Fetch student leave requests for teacher's classes
export async function getStudentLeaveList() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/student-leave-list`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

// Teacher: Approve/Reject a student leave request
export async function manageStudentLeave(studentLeaveId, { status, remark }) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/student-leave-manange/${studentLeaveId}`,
    { status, remark },
    { headers: { ...getAuthHeaders(), "Content-Type": "application/json" } }
  );
  return res.data;
}
