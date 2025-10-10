import { useMemo, useState } from "react";
import { getTeacherAttendanceHistory } from "../Utility/attendanceApi";
import { toast } from "react-toastify";

function fmt(d) {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function fmtTime12hSec(t) {
  if (!t) return "-";
  const [h, m = "00", s = "00"] = String(t).split(":");
  const hour = parseInt(h || 0, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hh = hour % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")} ${ampm}`;
}

export default function MyAttendanceHistory() {
  const today = useMemo(() => new Date(), []);
  const weekAgo = useMemo(() => new Date(Date.now() - 6 * 24 * 3600 * 1000), []);
  const [fromDate, setFromDate] = useState(fmt(weekAgo));
  const [toDate, setToDate] = useState(fmt(today));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onFetch() {
    try {
      setLoading(true);
      setError("");
      const res = await getTeacherAttendanceHistory({ from_date: fromDate, to_date: toDate });
      const list = Array.isArray(res?.resources?.data) ? res.resources.data : Array.isArray(res?.data) ? res.data : [];
      setRows(list);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to fetch history";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Start Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">End Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <button onClick={onFetch} disabled={loading || !fromDate || !toDate} className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold shadow border transition-colors ${loading || !fromDate || !toDate ? "bg-gray-300 text-gray-700" : "bg-gray-900 text-white hover:bg-black"}`}>
            {loading ? "Loading..." : "Fetch"}
          </button>
        </div>
      </div>

      {error && <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      <div className="p-4 sm:p-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">In Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Out Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>No records</td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.employee_attendance_id || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{r.attendance_date}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${/present/i.test(r.attendance_status) ? "bg-green-100 text-green-800 border border-green-200" : /absent/i.test(r.attendance_status) ? "bg-red-100 text-red-800 border border-red-200" : "bg-yellow-100 text-yellow-800 border border-yellow-200"}`}>
                      {r.attendance_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{fmtTime12hSec(r.in_time)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{fmtTime12hSec(r.out_time)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
