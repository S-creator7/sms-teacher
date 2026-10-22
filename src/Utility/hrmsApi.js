import axios from "axios";

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL;

// ===================== HELPERS =====================

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function downloadFile(url, filename) {
  return axios
    .get(url, { headers: getAuthHeaders(), responseType: "blob" })
    .then((response) => {
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    });
}

// ===================== 3.1 TEACHER DASHBOARD =====================

export async function getHrmsDashboard() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/dashboard`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

// ===================== 3.2 PROFILE & SERVICE BOOK =====================

export async function getProfile() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/profile`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function updateProfile(data) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/profile`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function downloadServiceBook() {
  return downloadFile(
    `${API_ENDPOINT}/v1/teacher/hrms/profile/download`,
    "ServiceBook.pdf"
  );
}

// ===================== 3.3 QUALIFICATIONS =====================

export async function getQualifications() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/qualifications`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function addQualification(data) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/hrms/qualifications`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function editQualification(id, data) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/qualifications/${id}`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function deleteQualification(id) {
  const res = await axios.delete(
    `${API_ENDPOINT}/v1/teacher/hrms/qualifications/${id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// ===================== 3.4 PRIOR EXPERIENCE =====================

export async function getExperiences() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/experiences`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function addExperience(data) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/hrms/experiences`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function editExperience(id, data) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/experiences/${id}`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function deleteExperience(id) {
  const res = await axios.delete(
    `${API_ENDPOINT}/v1/teacher/hrms/experiences/${id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// ===================== 3.5 NOMINEES =====================

export async function getNominees() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/nominees`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function addNominee(data) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/hrms/nominees`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function editNominee(id, data) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/nominees/${id}`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function deleteNominee(id) {
  const res = await axios.delete(
    `${API_ENDPOINT}/v1/teacher/hrms/nominees/${id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// ===================== 3.6 DOCUMENT VAULT =====================

export async function getDocuments() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/documents`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

// Step 1 — upload raw file binary, get back a URL
export async function uploadRawFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/chat/upload-file`,
    formData,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
}

// Step 2 — save document metadata with the URL from step 1
export async function uploadDocument(data) {
  const payload = {
    document_type: data.document_type,
    document_number: data.document_number || undefined,
    file_url: data.file_url,
    file_name: data.file_name || "document",
    file_size_kb: data.file_size_kb || 0,
  };
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/hrms/documents`,
    payload,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function editDocument(id, data) {
  const payload = {
    document_type: data.document_type,
    document_number: data.document_number || undefined,
    file_url: data.file_url,
    file_name: data.file_name || "document",
    file_size_kb: data.file_size_kb || 0,
  };
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/documents/${id}`,
    payload,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function deleteDocument(id) {
  const res = await axios.delete(
    `${API_ENDPOINT}/v1/teacher/hrms/documents/${id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// ===================== 3.7 ATTENDANCE =====================

export async function getAttendanceSummary(month, year) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/attendance/summary`,
    {
      headers: getAuthHeaders(),
      params: { month, year },
    }
  );
  return res.data;
}

export async function getAttendanceToday() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/attendance/today`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// ===================== 3.8 LEAVE MANAGEMENT =====================

export async function getLeaveTypes() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/leaves/types`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getLeaveBalances(academicYear) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/leaves/balances`,
    {
      headers: getAuthHeaders(),
      params: { academicYear }, // e.g. "2026-2027"
    }
  );
  return res.data;
}

export async function applyLeave(data) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/hrms/leaves/apply`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getLeaveHistory(status = "", limit = 20, offset = 0) {
  const params = { limit, offset };
  if (status && status !== "ALL") {
    params.status = status; // only send valid enum
  }
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/leaves/history`,
    {
      headers: getAuthHeaders(),
      params,
    }
  );
  return res.data;
}

export async function getLeaveDetails(id) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/leaves/${id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function cancelLeave(id, reason) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/leaves/${id}/cancel`,
    { cancellation_reason: reason },
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// ===================== 3.9 GATE PASSES =====================

export async function requestGatePass(data) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/hrms/gate-passes`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getGatePasses() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/gate-passes`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function getGatePassDetails(id) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/gate-passes/${id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function cancelGatePass(id, reason) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/gate-passes/${id}/cancel`,
    { reason },
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function downloadGatePass(id) {
  return downloadFile(
    `${API_ENDPOINT}/v1/teacher/hrms/gate-passes/${id}/download`,
    `GatePass-${id}.pdf`
  );
}

// ===================== 3.10 DUTY ROSTERS & SHIFTS =====================

export async function getShiftTimings() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/shift`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

/**
 * Duty Roster — REQUIRES startDate & endDate in YYYY-MM-DD format.
 * Example: getDutyRosters("2026-10-01", "2026-10-31")
 * Backend error if format wrong:
 *   "querystring/startDate must match format \"date\""
 */
export async function getDutyRosters(startDate, endDate) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/duties/roster`,
    {
      headers: getAuthHeaders(),
      params: { startDate, endDate },
    }
  );
  return res.data;
}

export async function getProxySchedule(date) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/proxy/schedule`,
    {
      headers: getAuthHeaders(),
      params: date ? { date } : {},
    }
  );
  return res.data;
}

// ===================== 3.11 PAYROLL =====================

export async function getPayslips(year) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/payslips`, {
    headers: getAuthHeaders(),
    params: { year }, // e.g. 2026
  });
  return res.data;
}

export async function getPayslipDetails(id) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/payslips/${id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function downloadPayslip(id) {
  return downloadFile(
    `${API_ENDPOINT}/v1/teacher/hrms/payslips/${id}/download`,
    `Payslip-${id}.pdf`
  );
}

export async function getSalaryStructure() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/salary-structure`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getLoans() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/loans`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

// ===================== 3.12 CPD TRACKER =====================

export async function getCpdProgress(academic_year) {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/cpd/progress`,
    {
      headers: getAuthHeaders(),
      params: { academic_year },
    }
  );
  return res.data;
}

export async function getCpdCategories() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/cpd/categories`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function submitCpd(data) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/hrms/cpd/submit`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function editCpd(id, data) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/cpd/${id}`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function deleteCpd(id) {
  const res = await axios.delete(
    `${API_ENDPOINT}/v1/teacher/hrms/cpd/${id}`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// ===================== 3.13 APPRAISAL =====================

export async function getAppraisalCycles() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/appraisal/cycles`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getAppraisalDetails(cycle_id) {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/appraisal`, {
    headers: getAuthHeaders(),
    params: { cycle_id },
  });
  return res.data;
}

export async function submitSelfAppraisal(data) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/hrms/appraisal/self`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function updateSelfAppraisal(data) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/appraisal/self`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

// ===================== 3.14 ASSETS =====================

export async function getAssets() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/assets`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

// ===================== 3.15 RESIGNATION & TRANSFERS =====================

export async function getResignationStatus() {
  const res = await axios.get(
    `${API_ENDPOINT}/v1/teacher/hrms/resignation`,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function submitResignation(data) {
  const res = await axios.post(
    `${API_ENDPOINT}/v1/teacher/hrms/resignation`,
    data,
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function withdrawResignation(reason) {
  const res = await axios.put(
    `${API_ENDPOINT}/v1/teacher/hrms/resignation/withdraw`,
    { reason },
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function getTransferHistory() {
  const res = await axios.get(`${API_ENDPOINT}/v1/teacher/hrms/transfers`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}