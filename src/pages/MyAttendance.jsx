import { useState, useMemo } from "react";
import MyAttendanceToday from "./MyAttendanceToday";
import MyAttendanceHistory from "./MyAttendanceHistory";

export default function MyAttendance() {
  // Default to Today tab
  const [tab, setTab] = useState("today");

  const tabs = useMemo(() => ([
    { key: "today", label: "Today" },
    { key: "history", label: "History" },
  ]), []);

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Attendance</h1>
            <p className="text-sm text-gray-600 mt-1">Mark your attendance and review your logs</p>
          </div>

          {/* Tabs */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    tab === t.key
                      ? "bg-gray-600 text-white border-gray-700 shadow"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {tab === "today" ? (
              <MyAttendanceToday />
            ) : (
              <MyAttendanceHistory />
            )}
          </div>
        </div>
    </div>
  );
}
