import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

// Build auth headers at call time so we always read the latest token
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export async function LogInApi(body) {
  // Many auth endpoints expect HTTP Basic credentials
  // axios will add Authorization: Basic base64(username:password)
  const { username, password } = body || {};
  const response = await axios.post(
    `${API_ENDPOINT}/v1/teacher/login`,
    {},
    {
      auth: { username, password },
    }
  );
  return response.data;
}

export async function ForgotPassword(body) {
  const response = await axios.post(
    `${API_ENDPOINT}/v1/teacher/forgot-password`,
    body,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}


export async function TeacherLogoutApi() {
  const response = await axios.post(
    `${API_ENDPOINT}/v1/teacher/logout`,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(), // attaches Bearer token
      },
    }
  );

  return response.data;
}
