import { useContext, useMemo, useState } from "react";
import { UserContext } from "../components/Provider";
import { markTeacherAttendance } from "../Utility/attendanceApi";
import { toast } from "react-toastify";

function formatTime12hWithSeconds(t) {
  if (!t) return "-";
  const [h, m = "00", s = "00"] = String(t).split(":");
  const hour = parseInt(h || 0, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hh = hour % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")} ${ampm}`;
}

export default function MyAttendanceToday() {
  const { profile, refreshProfile } = useContext(UserContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const today = useMemo(() => profile?.today_attendance || {}, [profile]);
  const isMarked = Boolean(today?.is_attendance_marked);
  const inTime = today?.in_time || null;
  const outTime = today?.out_time || null;
  const status =
  today?.status && today.status !== "-"
    ? today.status
    : isMarked
    ? "Pending"
    : "Not Marked";
  const approval =
  today?.approval_status && today.approval_status !== "-"
    ? today.approval_status
    : isMarked
    ? "Pending"
    : "Not Applicable";

  async function onToggle() {
    setError("");
    try {
      setBusy(true);
      // Try browser geolocation; fallback to zeros if unavailable
      const coords = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve({ latitude: 0, longitude: 0 });
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve({ latitude: 0, longitude: 0 }),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
      const res = await markTeacherAttendance(coords);
      await refreshProfile();
      toast.success(res?.message || (isMarked && !outTime ? "Logout successful" : "Login successful"));
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to update attendance";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">Today</h2>
        <button
          onClick={onToggle}
          disabled={busy}
          className={`group inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
            isMarked && !outTime
              ? "bg-gray-300 text-gray-700"
        : "bg-[#f86730] text-white hover:bg-[#e55a29]"
          }`}
          title={isMarked && !outTime ? "Logout" : "Login"}
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-white/15">
            {isMarked && !outTime ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            )}
          </span>
          <span>{isMarked && !outTime ? "Logout" : "Login"}</span>
        </button>
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="text-xs text-gray-500 font-medium">Status</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{status}</div>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="text-xs text-gray-500 font-medium">Marked</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{isMarked ? "Yes" : "No"}</div>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="text-xs text-gray-500 font-medium">Time In</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{formatTime12hWithSeconds(inTime)}</div>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="text-xs text-gray-500 font-medium">Time Out</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{formatTime12hWithSeconds(outTime)}</div>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 sm:col-span-2">
          <div className="text-xs text-gray-500 font-medium">Approval</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{approval}</div>
        </div>
      </div>
    </div>
  );
}
