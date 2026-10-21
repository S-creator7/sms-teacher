import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getAdminExamList(params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/school-admin/exam/list`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data;
}


export async function getAdminExamScheduleList(params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/school-admin/exam/schedule/list`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data;
}

export async function createExamWithSchedule(body) {
  const res = await axios.post(`${API_ENDPOINT}/v1/school-admin/exam/create-with-schedule`, body, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function createExamSchedules(exam_id, schedules) {
  const res = await axios.post(`${API_ENDPOINT}/v1/school-admin/exam/${exam_id}/schedules`, schedules, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getAdminResultsByScheduler(scheduler_id) {
  const res = await axios.get(`${API_ENDPOINT}/v1/school-admin/exam/${scheduler_id}/results`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getTeacherExams(params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/exam`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data;
}

export async function getExamResultsList(params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/exam-results`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data;
}

export async function getSchedulerResults(scheduler_id, params = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/exam-results/${scheduler_id}`, {
    headers: getAuthHeaders(),
    params,
  });
  return res.data;
}

export async function submitSingleResult(scheduler_id, body) {
  const res = await axios.post(`${API_ENDPOINT}/v1/teacher/exam/${scheduler_id}/results`, body, {
    headers: getAuthHeaders(),
  });
  return res.data;
}
export async function submitBatchResults(scheduler_id, results = []) {
  const out = [];

  for (const r of results) {
    const payload = {
      student_id: r.student_id,
      marks_obtained: r.marks_obtained,
      remarks: r.remarks ?? "",
    };

    const res = await submitSingleResult(scheduler_id, payload);
    out.push(res);
  }

  return out;
}
