import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET /v1/teacher/staff-meeting/list
export async function listStaffMeetingsApi(params = {}) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/staff-meeting/list`,
    {
      headers: getAuthHeaders(),
      params
    }
  );
  return res.data;
}

// GET /v1/teacher/staff-meeting/join/:meeting_unique_id
export async function joinStaffMeetingApi(meetingUniqueId) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/staff-meeting/join/${meetingUniqueId}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}
