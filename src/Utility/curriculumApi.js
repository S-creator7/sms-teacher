import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Overview of curriculum for a class/section
export async function getCurriculumApi({ class_id, classroom_id }) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/school-admin/curriculum/overview`,
    {
      headers: getAuthHeaders(),
      params: { class_id, classroom_id },
    }
  );
  return res.data;
}

// Subject details (chapters/topics/progress)
export async function subjectDetailsApi({ subject_id, class_id, classroom_id }) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/school-admin/curriculum/subject-details`,
    {
      headers: getAuthHeaders(),
      params: { subject_id, class_id, classroom_id },
    }
  );
  return res.data;
}

// Sessions list (if needed for filtering)
export async function getSessionApi() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/school-admin/curriculum/session-list`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// Syllabus list (global)
export async function getSyllabusApi() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/school-admin/curriculum/syllabus-list`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// Module list for a class+subject
export async function getModulesApi({ class_id, subject_id }) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/school-admin/curriculum/module-list`,
    {
      headers: getAuthHeaders(),
      params: { class_id, subject_id },
    }
  );
  return res.data;
}

// Subjects available for a classroom (teacher context)
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

// Create a new chapter/module under a subject
export async function createModuleApi(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/school-admin/curriculum/create-module`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// Create a new topic under a module
export async function createTopicApi(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/school-admin/curriculum/create-topic`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// Topic list by module (optional; subject-details may already include topics)
export async function getTopicListApi(module_id) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/school-admin/curriculum/topic-list`,
    {
      headers: getAuthHeaders(),
      params: { module_id },
    }
  );
  return res.data;
}

// Create and update school sessions (admin endpoints; will surface errors if not permitted)
export async function createSchoolSessionApi(body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/school-admin/curriculum/create-school-session`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function updateSchoolSessionApi(session_id, body) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/school-admin/curriculum/update-school-session/${session_id}`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// Teacher progress update for marking topics completed/in-progress
export async function updateTopicProgressApi(body) {
  // expected body example: { topic_id, status: 'completed' }
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/progress`,
    body,
    { headers: getAuthHeaders() }
  );
  return res.data;
}
