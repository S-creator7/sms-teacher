import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch all students under the teacher's classrooms
 * along with their assigned vehicle/route/IMEI info.
 */
export async function getStudentsTracking() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/transport/students-tracking`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

/**
 * Fetch the latest GPS location for a given IMEI.
 * @param {string} imei - 15-digit device IMEI
 */
export async function getLiveLocation(imei) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/transport/live/${imei}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

/**
 * Fetch GPS history for a given IMEI on a specific date.
 * @param {string} imei  - 15-digit device IMEI
 * @param {string} date  - ISO date string "YYYY-MM-DD"
 */
export async function getHistory(imei, date) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/transport/history/${imei}`,
    {
      headers: getAuthHeaders(),
      params: { date },
    }
  );
  return res.data;
}
