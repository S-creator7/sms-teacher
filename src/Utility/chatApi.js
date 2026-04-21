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

export async function getConversations(params = {}) {
  const response = await axios.get(`${API_ENDPOINT}/v1/teacher/chat/conversations`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
}

export async function getMessages(conversationId, params = {}) {
  const response = await axios.get(
    `${API_ENDPOINT}/v1/teacher/chat/conversations/${conversationId}/messages`,
    {
      headers: getAuthHeaders(),
      params,
    }
  );
  return response.data;
}

export async function sendMessage(conversationId, body) {
  const response = await axios.post(
    `${API_ENDPOINT}/v1/teacher/chat/conversations/${conversationId}/messages`,
    body,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

export async function uploadChatFile(file) {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds 10MB limit");
  }

  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/heic",
    "image/heif",
    "image/png",
    "image/gif",
    "image/tiff",
    "application/pdf",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.oasis.opendocument.text"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not supported. Please upload images or documents.`);
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await axios.post(`${API_ENDPOINT}/v1/teacher/chat/upload-file`, formData, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.message || "Invalid file format or size";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function markConversationRead(conversationId) {
  const response = await axios.put(
    `${API_ENDPOINT}/v1/teacher/chat/conversations/${conversationId}/read`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
}

export async function softDeleteMessage(messageId) {
  const response = await axios.put(
    `${API_ENDPOINT}/v1/teacher/chat/messages/${messageId}/soft-delete`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
}

export async function getConversationParticipants(conversationId) {
  const response = await axios.get(
    `${API_ENDPOINT}/v1/teacher/chat/conversations/${conversationId}/participants`,
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
}

export async function getUnreadCount() {
  const response = await axios.get(`${API_ENDPOINT}/v1/teacher/chat/unread-count`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function subscribeUnreadCount() {
  const response = await axios.post(
    `${API_ENDPOINT}/v1/teacher/chat/unread-count/subscribe`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
}

export async function getClassStudentParents(params = {}) {
  const response = await axios.get(`${API_ENDPOINT}/v1/teacher/chat/class-student-parents`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
}

export async function searchParents(params = {}) {
  const response = await axios.get(`${API_ENDPOINT}/v1/teacher/chat/search-parents`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
}

export async function startConversation(body) {
  const response = await axios.post(`${API_ENDPOINT}/v1/teacher/chat/start-conversation`, body, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function addReaction(messageId, body) {
  const response = await axios.post(
    `${API_ENDPOINT}/v1/teacher/chat/messages/${messageId}/reactions`,
    body,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

export async function searchMessages(conversationId, params = {}) {
  const response = await axios.get(
    `${API_ENDPOINT}/v1/teacher/chat/conversations/${conversationId}/search`,
    {
      headers: getAuthHeaders(),
      params,
    }
  );
  return response.data;
}

export async function forwardMessage(messageId, body) {
  const response = await axios.post(
    `${API_ENDPOINT}/v1/teacher/chat/messages/${messageId}/forward`,
    body,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

export async function archiveConversation(conversationId) {
  const response = await axios.put(
    `${API_ENDPOINT}/v1/teacher/chat/conversations/${conversationId}/archive`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
}

export async function unarchiveConversation(conversationId) {
  const response = await axios.put(
    `${API_ENDPOINT}/v1/teacher/chat/conversations/${conversationId}/unarchive`,
    {},
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
}

export async function debugMessage(messageId) {
  const response = await axios.get(
    `${API_ENDPOINT}/v1/teacher/chat/messages/${messageId}/debug`,
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
}
