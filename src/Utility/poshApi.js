import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createComplaint(formData) {
  const res = await axios.post(`${API_ENDPOINT}/v1/teacher/complaints`, formData, {
    headers: { ...getAuthHeaders() },
  });
  return res.data;
}

export async function getComplaints(params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/complaints`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data;
}

export async function getCommitteeMembers() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/committee-members`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}
