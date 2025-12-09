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

/* ----------------------------------------------------------------
   1️⃣ Get Ticket Categories
------------------------------------------------------------------ */
export const getTeacherTicketCategories = async () => {
  try {
    const response = await axios.get(
      `${API_ENDPOINT}/v1/teacher/tickets/categories`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch ticket categories:", error);

    return {
      status: false,
      code: error.response?.status || 500,
      message:
        error.response?.data?.message ||
        "Something went wrong while fetching ticket categories",
      resources: { data: { categories: [] } },
    };
  }
};

/* ----------------------------------------------------------------
   2️⃣ Create Ticket
------------------------------------------------------------------ */
export const createTeacherTicket = async ({
  title,
  description,
  category_id,
  priority = "Low",
}) => {
  try {
    const response = await axios.post(
      `${API_ENDPOINT}/v1/teacher/tickets/`,
      {
        title,
        description,
        category_id,
        priority,
      },
      { headers: getAuthHeaders() }
    );

    return response.data;
  } catch (error) {
    console.error("Failed to create ticket:", error);

    return {
      status: false,
      code: error.response?.status || 500,
      message:
        error.response?.data?.message ||
        "Something went wrong while creating the ticket",
    };
  }
};

/* ----------------------------------------------------------------
   3️⃣ Get Own Tickets
------------------------------------------------------------------ */
export const getTeacherTickets = async () => {
  try {
    const response = await axios.get(
      `${API_ENDPOINT}/v1/teacher/tickets/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch tickets:", error);

    return {
      status: false,
      code: error.response?.status || 500,
      message:
        error.response?.data?.message ||
        "Something went wrong while fetching tickets",
      resources: { data: [] },
    };
  }
};

/* ----------------------------------------------------------------
   4️⃣ Add Comment
------------------------------------------------------------------ */
export const addTeacherTicketComment = async (ticketId, comment_text) => {
  try {
    const response = await axios.post(
      `${API_ENDPOINT}/v1/teacher/tickets/${ticketId}/comments`,
      { comment_text },
      { headers: getAuthHeaders() }
    );

    return response.data;
  } catch (error) {
    console.error("Failed to add comment:", error);

    return {
      status: false,
      code: error.response?.status || 500,
      message:
        error.response?.data?.message ||
        "Something went wrong while adding comment",
    };
  }
};

/* ----------------------------------------------------------------
   5️⃣ Get Ticket Details
------------------------------------------------------------------ */
export const getTeacherTicketDetails = async (ticketId) => {
  try {
    const response = await axios.get(
      `${API_ENDPOINT}/v1/teacher/tickets/${ticketId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch ticket details:", error);

    return {
      status: false,
      code: error.response?.status || 500,
      message:
        error.response?.data?.message ||
        "Something went wrong while fetching ticket details",
      resources: { data: null },
    };
  }
};

/* ----------------------------------------------------------------
   6️⃣ Upload Attachment
------------------------------------------------------------------ */
export const uploadTeacherTicketAttachment = async (ticketId, file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      `${API_ENDPOINT}/v1/teacher/tickets/${ticketId}/attachments`,
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
    console.error("Failed to upload attachment:", error);

    return {
      status: false,
      code: error.response?.status || 500,
      message:
        error.response?.data?.message ||
        "Something went wrong while uploading attachment",
    };
  }
};
