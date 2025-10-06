import { useEffect, useState } from "react";
import { getSessionApi, createSchoolSessionApi, updateSchoolSessionApi } from "../Utility/curriculumApi";
import toast from "react-hot-toast";

export default function SessionManage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);

  const [form, setForm] = useState({ session_name: "", start_date: "", end_date: "" });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({ session_name: "", start_date: "", end_date: "" });

  async function loadSessions() {
    try {
      setLoading(true);
      setError("");
      const res = await getSessionApi();
      setSessions(res?.resources?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load sessions");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadSessions(); }, []);

  async function onCreate(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await createSchoolSessionApi({
        session_name: form.session_name,
        start_date: form.start_date,
        end_date: form.end_date,
      });
      if (res?.status) {
        toast.success(res?.message || "Session created");
        setForm({ session_name: "", start_date: "", end_date: "" });
        loadSessions();
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to create session");
    } finally { setLoading(false); }
  }

  async function onUpdate(e) {
    e.preventDefault();
    if (!editingId) return;
    try {
      setLoading(true);
      const res = await updateSchoolSessionApi(editingId, {
        session_name: editForm.session_name,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
      });
      if (res?.status) {
        toast.success(res?.message || "Session updated");
        setEditingId("");
        loadSessions();
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to update session");
    } finally { setLoading(false); }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Sessions</h1>
          <p className="text-xs text-gray-600">Create and update school sessions</p>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={onCreate} className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Create Session</h2>
            <div className="grid grid-cols-1 gap-3">
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Session name"
                value={form.session_name}
                onChange={(e) => setForm(v => ({ ...v, session_name: e.target.value }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.start_date} onChange={(e) => setForm(v => ({ ...v, start_date: e.target.value }))} />
                <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.end_date} onChange={(e) => setForm(v => ({ ...v, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button disabled={loading || !form.session_name || !form.start_date || !form.end_date}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">Create</button>
            </div>
          </form>

          <form onSubmit={onUpdate} className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Update Session</h2>
            <div className="grid grid-cols-1 gap-3">
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={editingId}
                onChange={(e) => {
                  const id = e.target.value;
                  setEditingId(id);
                  const s = sessions.find(x => String(x.session_id) === String(id));
                  setEditForm({ session_name: s?.session_name || "", start_date: s?.start_date?.slice(0,10) || "", end_date: s?.end_date?.slice(0,10) || "" });
                }}
              >
                <option value="">Select Session</option>
                {sessions.map(s => (
                  <option key={s.session_id} value={s.session_id}>{s.session_name}</option>
                ))}
              </select>
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Session name"
                value={editForm.session_name}
                onChange={(e) => setEditForm(v => ({ ...v, session_name: e.target.value }))}
                disabled={!editingId}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editForm.start_date} onChange={(e) => setEditForm(v => ({ ...v, start_date: e.target.value }))} disabled={!editingId} />
                <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editForm.end_date} onChange={(e) => setEditForm(v => ({ ...v, end_date: e.target.value }))} disabled={!editingId} />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button disabled={loading || !editingId || !editForm.session_name || !editForm.start_date || !editForm.end_date}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">Update</button>
            </div>
          </form>
        </div>

        <div className="px-4 sm:px-5 pb-5">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 border-b">#</th>
                  <th className="text-left px-3 py-2 border-b">Name</th>
                  <th className="text-left px-3 py-2 border-b">Start</th>
                  <th className="text-left px-3 py-2 border-b">End</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => (
                  <tr key={s.session_id || idx}>
                    <td className="px-3 py-2 border-b">{idx + 1}</td>
                    <td className="px-3 py-2 border-b">{s.session_name}</td>
                    <td className="px-3 py-2 border-b">{(s.start_date || '').slice(0,10)}</td>
                    <td className="px-3 py-2 border-b">{(s.end_date || '').slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
