import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCurriculumApi({ class_id, classroom_id }) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/curriculum/overview`,
    {
      headers: getAuthHeaders(),
      params: { class_id, classroom_id },
    }
  );
  return res.data;
}

export async function subjectDetailsApi({ subject_id, class_id, classroom_id }) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/curriculum/subject-details`,
    {
      headers: getAuthHeaders(),
      params: { subject_id, class_id, classroom_id },
    }
  );
  return res.data;
}

export async function getSessionApi() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/curriculum/session-list`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getSyllabusApi() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/curriculum/syllabus-list`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getModulesApi({ class_id, subject_id }) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/curriculum/module-list`,
    {
      headers: getAuthHeaders(),
      params: { class_id, subject_id },
    }
  );
  return res.data;
}

export async function getSubjectsApi(classroom_id) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/static/subject-list`,
    {
      headers: getAuthHeaders(),
      params: { classroom_id },
    }
  );
  return res.data;
}

export async function createModuleApi(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/curriculum/create-module`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function createTopicApi(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/curriculum/create-topic`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getTopicListApi(module_id) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/curriculum/topic-list`,
    {
      headers: getAuthHeaders(),
      params: { module_id },
    }
  );
  return res.data;
}

export async function createSchoolSessionApi(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/curriculum/create-school-session`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function updateSchoolSessionApi(session_id, body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/curriculum/update-school-session/${session_id}`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function updateTopicProgressApi(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/progress`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}
