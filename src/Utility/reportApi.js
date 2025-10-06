import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function reportPreview(body) {
  const res = await axios.post(`${API_ENDPOINT}/v1/teacher/report/preview`, body, {
    headers: getAuthHeaders(),
  });
  return res.data; // { status, code, message, resources: { data: [] } }
}

export async function reportGenerate(body) {
  const res = await axios.post(`${API_ENDPOINT}/v1/teacher/report/generate`, body, {
    headers: getAuthHeaders(),
  });
  return res.data; // { status, code, message, resources: { data: [] } }
}

export async function reportList(params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/report/list`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data; // { status, code, message, resources: { data: [...], pagination: {...} } }
}
