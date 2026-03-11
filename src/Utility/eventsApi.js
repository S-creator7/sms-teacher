import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const eventsApi = {
  // Get all events with pagination and filters
  getEvents: async (params = {}) => {
    const { category, search, page = 1, limit = 10 } = params;
    const queryParams = new URLSearchParams();
    
    if (category) queryParams.append('category', category);
    if (search) queryParams.append('search', search);
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    const response = await axios.get(`${API_ENDPOINT}/v1/teacher/events?${queryParams.toString()}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Get student certificates with pagination and search
  getCertificates: async (params = {}) => {
    const { search, page = 1, limit = 10 } = params;
    const queryParams = new URLSearchParams();
    
    if (search) queryParams.append('search', search);
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    const response = await axios.get(`${API_ENDPOINT}/v1/teacher/events/certificates?${queryParams.toString()}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Download certificate PDF
  downloadCertificate: async (studentEventId) => {
    const response = await fetch(`${API_ENDPOINT}/v1/teacher/events/certificates/${studentEventId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download certificate');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate_${studentEventId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
