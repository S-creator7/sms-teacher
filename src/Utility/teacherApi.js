import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export async function Profile() {
  try {
    const response = await axios.get(
      `${API_ENDPOINT}/v1/teacher/profile`,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function ProfileUpdate(formData) {
  try {
    const response = await axios.put(
      `${API_ENDPOINT}/v1/teacher/profile-update`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function ChangePassword(body) {
  try {
    const response = await axios.post(
      `${API_ENDPOINT}/v1/teacher/change-password`,
      body,
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}