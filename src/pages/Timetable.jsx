import { useEffect, useMemo, useState, useCallback } from "react";
import { getWeekTimetable, getTimetableByDay } from "../Utility/dashboardApi";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function toHHmm(input) {
  if (!input) return "";
  if (typeof input === "string") {
    const m = input.match(/(\d{1,2}):(\d{2})/);
    if (m) {
      const h = String(m[1]).padStart(2, "0");
      const mm = m[2];
      return `${h}:${mm}`;
    }
  }
  try {
    const d = new Date(`1970-01-01T${input}`);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return String(input);
  }
}

function getTodayLabel() {
  const idx = new Date().getDay();
  return DAYS[(idx + 6) % 7];
}

export default function Timetable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekMap, setWeekMap] = useState({});
  const [activeDay, setActiveDay] = useState(getTodayLabel());
  const [dayData, setDayData] = useState([]);

  const fetchWeek = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const map = await getWeekTimetable(DAYS);
      setWeekMap(map);
      const initial = map[activeDay] || [];
      setDayData(initial);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }, [activeDay]);

  const fetchDay = useCallback(async (day) => {
    try {
      setError("");
      const res = await getTimetableByDay(day);
      const rows = res?.resources?.data || [];
      setDayData(rows);
      setWeekMap((prev) => ({ ...prev, [day]: rows }));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load day timetable");
    }
  }, []);

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  useEffect(() => {
    if (weekMap[activeDay]) {
      setDayData(weekMap[activeDay]);
    } else {
      fetchDay(activeDay);
    }
  }, [activeDay, weekMap, fetchDay]);

  const hasAnyData = useMemo(() => Object.values(weekMap).some((arr) => (arr || []).length > 0), [weekMap]);

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Timetable</h1>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`whitespace-nowrap text-sm sm:text-base px-3 py-1.5 rounded-lg border transition-colors ${activeDay === d ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
              >
                {d}
              </button>
            ))}
            </div>
          </div>
          <div className="p-4">
            {error && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : dayData.length === 0 ? (
              <div className="text-sm text-gray-500">No periods scheduled for {activeDay}.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {dayData.map((p, i) => (
                  <div key={i} className="p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-all bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold">Period {p.period_number}</div>
                        <div>
                          <div className="text-base sm:text-lg font-medium text-gray-900">{p.subject || (p.is_break ? "Break" : "Free")}</div>
                          <div className="text-sm text-gray-600">{p.class_name}{p.section_name ? ` • Sec ${p.section_name}` : ""}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm sm:text-base font-medium text-gray-900">{toHHmm(p.start_time)} - {toHHmm(p.end_time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Weekly Overview</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            {loading && !hasAnyData ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 min-w-[700px]">
                {DAYS.map((d) => (
                  <div key={d} className="border border-gray-200 rounded-lg bg-white">
                    <div className="px-3 py-2 border-b border-gray-200 text-sm sm:text-base font-medium text-gray-900">{d}</div>
                    <div className="p-2 space-y-2">
                      {(weekMap[d] || []).length === 0 ? (
                        <div className="text-xs sm:text-sm text-gray-500">No periods</div>
                      ) : (
                        (weekMap[d] || []).map((p, i) => (
                          <div key={`${d}-${i}`} className="p-2 rounded bg-gray-50 border border-gray-200">
                            <div className="text-sm font-semibold text-gray-800">{p.subject || (p.is_break ? "Break" : "Free")}</div>
                            <div className="text-xs sm:text-sm text-gray-600">{toHHmm(p.start_time)} - {toHHmm(p.end_time)}</div>
                            <div className="text-xs sm:text-sm text-gray-600">{p.class_name}{p.section_name ? ` • Sec ${p.section_name}` : ""}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
