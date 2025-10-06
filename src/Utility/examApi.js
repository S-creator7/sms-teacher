import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// GET /v1/teacher/exam - list exam schedules assigned to teacher
export async function getTeacherExams(params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/exam`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data; // { status, code, message, resources: { data: { exams: [], pagination: {} } } }
}

// GET /v1/teacher/exam-results - list result summaries across schedules
export async function getExamResultsList(params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/exam-results`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data; // { status, code, message, resources: { data: [], pagination: {} } }
}

// GET /v1/teacher/exam-results/{scheduler_id} - detailed results for a schedule
export async function getSchedulerResults(scheduler_id, params = {}) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/exam-results/${scheduler_id}`,
    { headers: getAuthHeaders(), params }
  );
  return res.data; // { status, code, message, resources: { data: [] } }
}

// POST /v1/teacher/exam/{scheduler_id}/results - create a single student's result
// body: { student_id, marks_obtained, remarks? }
export async function submitSingleResult(scheduler_id, body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/exam/${scheduler_id}/results`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// Helper to submit multiple results sequentially
export async function submitBatchResults(scheduler_id, results = []) {
  const out = [];
  for (const r of results) {
    const payload = {
      student_id: r.student_id,
      marks_obtained: r.marks_obtained,
      ...(r.remarks ? { remarks: r.remarks } : {}),
    };
    // eslint-disable-next-line no-await-in-loop
    const res = await submitSingleResult(scheduler_id, payload);
    out.push(res);
  }
  return out;
}
