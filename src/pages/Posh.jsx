import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { createComplaint, getComplaints, getCommitteeMembers } from "../Utility/poshApi";
import { useNavigate } from "react-router-dom";

const typeOptions = [
  { value: "posco", label: "POCSO" },
  { value: "posh", label: "POSH" },
  { value: "general", label: "General" },
  { value: "harassment", label: "Harassment" },
  { value: "misconduct", label: "Misconduct" },
];

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In Review" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

function StatusBadge({ status }) {
  const map = {
    resolved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    in_review: "bg-amber-50 text-amber-700",
    pending: "bg-gray-50 text-gray-700",
  };
  const cls = map[status] || map.pending;
  const label = statusOptions.find((s) => s.value === status)?.label || "Pending";
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

export default function Posh() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("file");
  const [form, setForm] = useState({ title: "", subject: "", description: "", type: "posh", attachment: null });
  const canSubmit = useMemo(
    () => form.title.trim() && form.subject.trim() && form.description.trim() && form.type,
    [form]
  );
  const [submitting, setSubmitting] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [filter, setFilter] = useState({ type: "", complaint_status: "" });
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

  useEffect(() => {
    loadComplaints();
    loadMembers();
  }, []);

  async function onSubmitComplaint(e) {
    e?.preventDefault?.();
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("subject", form.subject);
      fd.append("description", form.description);
      fd.append("type", form.type);
      if (form.attachment) {
        fd.append("attachment", form.attachment, form.attachment.name);
      }
      await createComplaint(fd);
      toast.success("Complaint submitted successfully");
      setForm({ title: "", subject: "", description: "", type: "posh", attachment: null });
      setTab("complaints");
      loadComplaints();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to submit complaint";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function loadComplaints() {
    try {
      setLoadingComplaints(true);
      const res = await getComplaints({
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.complaint_status ? { complaint_status: filter.complaint_status } : {}),
      });
      const list = res?.resources?.data ?? res?.data ?? [];
      setComplaints(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to fetch complaints");
    } finally {
      setLoadingComplaints(false);
    }
  }

  async function loadMembers() {
    try {
      setLoadingMembers(true);
      const res = await getCommitteeMembers();
      const list = res?.data ?? res?.resources?.data ?? [];
      setMembers(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to fetch committee members");
    } finally {
      setLoadingMembers(false);
    }
  }

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
           
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">POSH & Safety</h1>
              <p className="text-xs text-gray-500 mt-0.5">File confidential complaints and access emergency support</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white p-0.5 rounded-lg shadow-sm border border-gray-200 w-full sm:w-auto">
          {[
            { key: "file", label: "File Complaint" },
            { key: "emergency", label: "Emergency Help" },
            { key: "complaints", label: "My Complaints" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex-1 sm:flex-none ${
                tab === t.key
                  ? "bg-[#f86730] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "file" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Submit a Confidential Complaint</h2>
              <p className="text-xs text-gray-500 mt-0.5">Provide clear details. Your report will be handled by the school's internal committee.</p>
            </div>
            <form className="p-4" onSubmit={onSubmitComplaint}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Short, clear title"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Who/where the issue occurred"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    {typeOptions.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Attachment (optional)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && file.size > MAX_ATTACHMENT_BYTES) {
                        toast.error(`Attachment too large. Max 5 MB allowed.`);
                        e.target.value = "";
                        setForm((f) => ({ ...f, attachment: null }));
                        return;
                      }
                      setForm((f) => ({ ...f, attachment: file }));
                    }}
                    className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
                  />
                  {form.attachment && (
                    <div className="mt-1 text-xs text-gray-500">Selected: <span className="font-medium text-gray-700">{form.attachment.name}</span></div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Please include date/time, people involved, and what happened."
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition resize-y"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setForm({ title: "", subject: "", description: "", type: "posh", attachment: null })}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-sm font-medium order-2 sm:order-1"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className={`px-4 py-2 rounded-lg text-white font-medium transition text-sm order-1 sm:order-2 ${
                    !canSubmit || submitting
                      ? "bg-[#f86730]/60 cursor-not-allowed"
                      : "bg-[#f86730] hover:bg-[#e55a29] shadow-sm hover:shadow"
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    "Submit Complaint"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === "emergency" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            {/* Emergency Contacts */}
            <div className="border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-sm font-semibold text-gray-800">Emergency Contacts</h2>
              <p className="text-xs text-gray-500 mt-0.5">Quick access to emergency support numbers</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[ 
                { title: "POSH Helpline", phone: "1800-123-456", desc: "Women helpline (24x7)", icon: "🛡️" },
                { title: "Police Control Room", phone: "100", desc: "All emergency number", icon: "🚔" },
                { title: "Ambulance Service", phone: "108", desc: "Medical emergency", icon: "🚑" },
              ].map((c) => (
                <div key={c.title} className="rounded-lg border border-gray-200 p-4 hover:shadow-sm transition">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{c.icon}</span>
                    <div className="text-xs font-medium text-gray-500">{c.title}</div>
                  </div>
                  <div className="text-xl font-bold text-gray-800">{c.phone}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.desc}</div>
                  <div className="mt-3 flex gap-2">
                    <a href={`tel:${c.phone}`} className="inline-flex px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition">
                      Call Now
                    </a>
                    <a href={`sms:${c.phone}`} className="inline-flex px-3 py-1 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-900 transition">
                      Message
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Committee Members */}
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-800">Internal Committee Members</h2>
                <p className="text-xs text-gray-500 mt-0.5">School's POSH committee for handling complaints</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingMembers ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#f86730] border-t-transparent"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading committee members...</p>
                  </div>
                ) : members?.length ? (
                  members.map((m) => (
                    <div key={m.member_id} className="rounded-lg border border-gray-200 p-4 hover:shadow-sm transition">
                      <div className="text-sm font-semibold text-gray-800">{m.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{m.designation} • {m.member_type}</div>
                      <div className="mt-2 text-xs">
                        <div className="text-gray-600">Email: <a className="text-[#f86730] hover:underline" href={`mailto:${m.email}`}>{m.email}</a></div>
                        <div className="text-gray-600">Phone: <a className="text-[#f86730] hover:underline" href={`tel:${m.phone_number}`}>{m.phone_number}</a></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-sm text-gray-500">No committee members found</div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "complaints" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">My Complaints</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {complaints.length > 0 
                      ? `${complaints.length} complaints found` 
                      : "Your submitted complaints"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
                    value={filter.type}
                    onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="">All Types</option>
                    {typeOptions.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
                    value={filter.complaint_status}
                    onChange={(e) => setFilter((f) => ({ ...f, complaint_status: e.target.value }))}
                  >
                    <option value="">All Status</option>
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button 
                    onClick={loadComplaints} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f86730] text-white text-sm font-medium hover:bg-[#e55a29] transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingComplaints ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#f86730] border-t-transparent"></div>
                        <p className="mt-2">Loading complaints...</p>
                      </td>
                    </tr>
                  ) : complaints?.length ? (
                    complaints.map((c) => (
                      <tr key={c.complaint_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-800">{c.title}</div>
                          <div className="text-xs text-gray-500">{c.subject}</div>
                        </td>
                        <td className="px-4 py-2.5 capitalize text-gray-600">{c.type}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={c.complaint_status} /></td>
                        <td className="px-4 py-2.5 text-gray-500">{c.created_at?.split(" ")[0] || c.created_at}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No complaints found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}