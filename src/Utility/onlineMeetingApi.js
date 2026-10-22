import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET /v1/teacher/classrooms (to select classroom for scheduling)
export async function getTeacherClassrooms() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/classrooms`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

// POST /v1/teacher/online-meeting/schedule
export async function scheduleMeetingApi(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/online-meeting/schedule`,
    body,
    { headers: { ...getAuthHeaders(), "Content-Type": "application/json" } }
  );
  return res.data;
}

// GET /v1/teacher/online-meeting/list
export async function listMeetingsApi(params = {}) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/online-meeting/list`,
    {
      headers: getAuthHeaders(),
      params
    }
  );
  return res.data;
}

// GET /v1/teacher/online-meeting/join/:meeting_unique_id
export async function joinMeetingApi(meetingUniqueId) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/online-meeting/join/${meetingUniqueId}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// PUT /v1/teacher/online-meeting/update/:meeting_unique_id
export async function updateMeetingApi(meetingUniqueId, body) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/online-meeting/update/${meetingUniqueId}`,
    body,
    { headers: { ...getAuthHeaders(), "Content-Type": "application/json" } }
  );
  return res.data;
}

// DELETE /v1/teacher/online-meeting/delete/:meeting_unique_id
export async function deleteMeetingApi(meetingUniqueId) {
  const res = await axios.delete(
    `${API_ENDPOINT}/v1/teacher/online-meeting/delete/${meetingUniqueId}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// GET /v1/teacher/online-meeting/attendance/:meeting_unique_id
export async function getMeetingAttendanceApi(meetingUniqueId) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/online-meeting/attendance/${meetingUniqueId}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}
