import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getTeacherProfile() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/profile`, { headers: getAuthHeaders() });
  return res.data;
}

export async function getTodayTimetable(dayLabel) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/timetable`, {
    headers: getAuthHeaders(),
    params: { day: dayLabel },
  });
  return res.data;
}

export async function getTimetableByDay(dayLabel) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/timetable`, {
    headers: getAuthHeaders(),
    params: { day: dayLabel },
  });
  return res.data;
}

export async function getWeekTimetable(days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]) {
  const requests = days.map((d) =>
    axios.get(`${API_ENDPOINT}/v1/teacher/timetable`, {
      headers: getAuthHeaders(),
      params: { day: d },
    }).then((res) => ({ day: d, data: res.data?.resources?.data || [] }))
  );
  const results = await Promise.all(requests);
  const map = {};
  results.forEach((r) => { map[r.day] = r.data; });
  return map;
}

export async function getTeacherClassrooms() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/classrooms`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getStudentList(classroom_id) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/student-list/${classroom_id}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getAssignmentsList() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/assignments`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getAnnouncements() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/announcements`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getNotifications() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/notifications`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getAttendanceByClassroom(classroom_id, date) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/attendance/${classroom_id}`, {
    headers: getAuthHeaders(),
    params: { date },
  });
  return res.data;
}

export async function getExamList({ filter = "upcoming", page = 1, limit = 5, classroom_id } = {}) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/exam`, {
    headers: getAuthHeaders(),
    params: { filter, page, limit, classroom_id },
  });
  return res.data;
}
