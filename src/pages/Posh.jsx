import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { createComplaint, getComplaints, getCommitteeMembers } from "../Utility/poshApi";

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
    resolved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    in_review: "bg-amber-100 text-amber-700 border-amber-200",
    pending: "bg-gray-100 text-gray-700 border-gray-200",
  };
  const cls = map[status] || map.pending;
  const label = statusOptions.find((s) => s.value === status)?.label || "Pending";
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>;
}

export default function Posh() {
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">POSH & Safety</h1>
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow border border-gray-200 w-full sm:w-auto">
          {[
            { key: "file", label: "File Complaint" },
            { key: "emergency", label: "Emergency Help" },
            { key: "complaints", label: "My Complaints" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-1 sm:flex-none ${
                tab === t.key ? "bg-black text-white shadow" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "file" && (
        <div className="w-full bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="mb-6">
            <div className="text-lg font-semibold text-gray-900">Submit a confidential complaint</div>
            <div className="text-sm text-gray-500">Provide clear details. Your report will be handled by the school's internal committee.</div>
          </div>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={onSubmitComplaint}>
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Short, clear title (e.g., Inappropriate behavior)"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-black focus:ring-1 focus:ring-black"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Who/where the issue occurred"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-black focus:ring-1 focus:ring-black"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-black focus:ring-1 focus:ring-black"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Attachment (optional)</label>
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
                className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-black focus:ring-1 focus:ring-black"
              />
              {form.attachment && (
                <div className="mt-1 text-xs text-gray-600">Selected: <span className="font-medium">{form.attachment.name}</span></div>
              )}
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>
              <textarea
                rows={4}
                placeholder="Please include date/time, people involved, and what happened."
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-black focus:ring-1 focus:ring-black"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-4">
              <button
                type="button"
                onClick={() => setForm({ title: "", subject: "", description: "", type: "posh", attachment: null })}
                className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className={`px-5 py-2 rounded-md text-white font-medium transition ${
                  !canSubmit || submitting ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-900"
                }`}
              >
                {submitting ? "Submitting..." : "Submit Complaint"}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "emergency" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[ 
              { title: "POSH Helpline", phone: "1800-123-456", desc: "Women helpline (24x7)" },
              { title: "Police Control Room", phone: "100", desc: "All emergency number" },
              { title: "Ambulance Service", phone: "108", desc: "Medical emergency" },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border border-gray-200 p-5 shadow-sm bg-gray-50">
                <div className="text-sm text-gray-500">{c.title}</div>
                <div className="text-2xl font-bold text-gray-800 mt-1">{c.phone}</div>
                <div className="text-xs text-gray-500 mt-1">{c.desc}</div>
                <div className="mt-3 flex gap-2">
                  <a href={`tel:${c.phone}`} className="inline-flex px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700">Call</a>
                  <a href={`sms:${c.phone}`} className="inline-flex px-3 py-1.5 rounded-lg bg-black text-white text-sm hover:bg-gray-900">Message</a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <div className="text-sm text-gray-700 font-semibold mb-3">School Internal Committee Members</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingMembers ? (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center text-gray-500 py-10">Loading...</div>
              ) : members?.length ? (
                members.map((m) => (
                  <div key={m.member_id} className="rounded-xl border border-gray-200 p-5 shadow-sm bg-white">
                    <div className="text-lg font-semibold text-gray-900">{m.name}</div>
                    <div className="text-sm text-gray-500">{m.designation} • {m.member_type}</div>
                    <div className="mt-2 text-sm">
                      <div className="text-gray-600">Email: <a className="text-blue-600 hover:underline" href={`mailto:${m.email}`}>{m.email}</a></div>
                      <div className="text-gray-600">Phone: <a className="text-blue-600 hover:underline" href={`tel:${m.phone_number}`}>{m.phone_number}</a></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center text-gray-500 py-10">No committee members found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "complaints" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b pb-4">
            <div className="text-sm text-gray-600">Your complaints</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-black focus:ring-1 focus:ring-black"
                value={filter.type}
                onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="">All Types</option>
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-black focus:ring-1 focus:ring-black"
                value={filter.complaint_status}
                onChange={(e) => setFilter((f) => ({ ...f, complaint_status: e.target.value }))}
              >
                <option value="">All Status</option>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button onClick={loadComplaints} className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900">Apply</button>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700">Title</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Type</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody>
                {loadingComplaints ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : complaints?.length ? (
                  complaints.map((c) => (
                    <tr key={c.complaint_id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{c.title}</div>
                        <div className="text-xs text-gray-500">{c.subject}</div>
                      </td>
                      <td className="p-3 capitalize">{c.type}</td>
                      <td className="p-3"><StatusBadge status={c.complaint_status} /></td>
                      <td className="p-3">{c.created_at?.split(" ")[0] || c.created_at}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500">No complaints found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}