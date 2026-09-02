import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { UserContext } from "../components/Provider";
import { markTeacherAttendance } from "../Utility/attendanceApi";
import { toast } from "react-toastify";
import TicketAnalytics from "../components/Tickets/TicketAnalytics";
import {
  getTodayTimetable,
  getTeacherClassrooms,
  getStudentList,
  getAssignmentsList,
  getAnnouncements,
  getNotifications,
  getAttendanceByClassroom,
  getExamList,
} from "../Utility/dashboardApi";

function formatGreeting(date) {
  const hours = date.getHours();
  if (hours < 12) return "Good morning";
  if (hours < 17) return "Good afternoon";
  return "Good evening";
}

function getDayLabel(date) {
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return labels[date.getDay()];
}

function formatTime(timeString) {
  if (!timeString) return "";
  const [hours, minutes = "00", seconds = "00"] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = (hour % 12 || 12).toString().padStart(2, '0');
  return `${formattedHour}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')} ${period}`;
}

export default function Dashboard() {
  const { profile, refreshProfile } = useContext(UserContext);

  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [classStudentsMap, setClassStudentsMap] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [expandedNotifId, setExpandedNotifId] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifBusyIds, setNotifBusyIds] = useState(new Set());
  const [notifBulkBusy, setNotifBulkBusy] = useState(false);
  const [attendanceToday, setAttendanceToday] = useState({});
  const [exams, setExams] = useState([]);
  const [error, setError] = useState("");
  const [expandedClassroom, setExpandedClassroom] = useState(null);
  const [attBusy, setAttBusy] = useState(false);
  const [attError, setAttError] = useState("");

  const todayAttendance = profile?.today_attendance || {};
  const isLoggedInToday = Boolean(todayAttendance?.is_attendance_marked);
  const hasLoggedOut = Boolean(todayAttendance?.out_time);

  const greeting = useMemo(() => formatGreeting(new Date()), []);
  const todayLabel = useMemo(() => getDayLabel(new Date()), []);
  const todayDateISO = useMemo(() => new Date().toISOString().split("T")[0], []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [ttRes, clsRes, asgRes, annRes, notRes, exmRes] = await Promise.all([
        getTodayTimetable(todayLabel),
        getTeacherClassrooms(),
        getAssignmentsList(),
        getAnnouncements(),
        getNotifications(),
        getExamList({ filter: "upcoming", page: 1, limit: 5 }),
      ]);

      const timetableData = ttRes?.resources?.data || [];
      const classroomsRaw = Array.isArray(clsRes?.resources?.data) ? clsRes.resources.data : [];
      const classroomsData = classroomsRaw.flatMap((cls) => {
        const classId = cls.class_id;
        const className = cls.class_name;
        const sections = Array.isArray(cls.sections) ? cls.sections : [];
        return sections.map((sec) => ({
          class_id: classId,
          class_name: className,
          section_id: sec.section_id,
          section_name: sec.section_name,
          classroom_id: sec.classroom_id,
          is_classteacher: sec.is_classteacher,
          subjectList: Array.isArray(sec.subjectList) ? sec.subjectList : [],
        }));
      });
      const assignmentsData = asgRes?.resources?.data || [];
      const announcementsData = annRes?.resources?.data || [];
      const notificationsData = notRes?.resources?.data || [];
      const examsData = exmRes?.resources?.data?.exams || [];

      setTimetable(timetableData);
      setClassrooms(classroomsData);
      setAssignments(assignmentsData);
      setAnnouncements(announcementsData);
      const LOCAL_KEY = "teacher_notification_read_ids";
      let localSet = new Set();
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) localSet = new Set(JSON.parse(raw));
      } catch { }
      const mergedNotifications = notificationsData.map((n) => ({
        ...n,
        is_read: Boolean(n.is_read) || localSet.has(n.notification_id),
      }));
      setNotifications(mergedNotifications);
      setExams(examsData);

      const studentCountPromises = [];
      const attendancePromises = [];
      for (const c of classroomsData) {
        if (c.classroom_id) {
          studentCountPromises.push(
            getStudentList(c.classroom_id).then((r) => ({
              classroom_id: c.classroom_id,
              count: (r?.resources?.data || []).length,
            }))
          );
          attendancePromises.push(
            getAttendanceByClassroom(c.classroom_id, todayDateISO).then((r) => ({
              classroom_id: c.classroom_id,
              taken: Array.isArray(r?.resources?.data) && r.resources.data.length > 0,
            }))
          );
        }
      }

      const [studentCounts, attendanceFlags] = await Promise.all([
        Promise.all(studentCountPromises),
        Promise.all(attendancePromises),
      ]);

      const scMap = {};
      studentCounts.forEach((it) => (scMap[it.classroom_id] = it.count));
      setClassStudentsMap(scMap);

      const attMap = {};
      attendanceFlags.forEach((it) => (attMap[it.classroom_id] = it.taken));
      setAttendanceToday(attMap);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [todayDateISO, todayLabel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const unreadCount = useMemo(() => (notifications || []).filter((n) => !n.is_read).length, [notifications]);

  const timeAgo = useCallback((ts) => {
    if (!ts) return "";
    const then = new Date(String(ts).replace(" ", "T"));
    const now = new Date();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return then.toLocaleDateString();
  }, []);

  const toggleNotifDrawer = useCallback(() => setNotifOpen((v) => !v), []);
  const closeNotifDrawer = useCallback(() => setNotifOpen(false), []);

  const setBusyFor = useCallback((id, busy) => {
    setNotifBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const onToggleRead = useCallback((n) => {
    const id = n.notification_id;
    const nextState = !n.is_read;
    setNotifications((prev) => prev.map((x) => (x.notification_id === id ? { ...x, is_read: nextState } : x)));
    const LOCAL_KEY = "teacher_notification_read_ids";
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const set = new Set(raw ? JSON.parse(raw) : []);
      if (nextState) set.add(id); else set.delete(id);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(set)));
    } catch { }
  }, []);

  const onMarkAllRead = useCallback(() => {
    if (unreadCount === 0) return;
    setNotifBulkBusy(true);
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    try {
      const LOCAL_KEY = "teacher_notification_read_ids";
      const ids = (notifications || []).map((n) => n.notification_id);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
    } catch { }
    setNotifBulkBusy(false);
  }, [notifications, unreadCount]);

  const pendingAssignments = useMemo(() => {
    let pending = 0;
    let recentlyGraded = 0;
    (assignments || []).forEach((a) => {
      const total = Number(a.total_students || 0);
      const completed = Number(a.completed_students || 0);
      pending += Math.max(total - completed, 0);
      recentlyGraded += completed;
    });
    return { pending, recentlyGraded };
  }, [assignments]);

  const toggleSubjectExpansion = useCallback((classroomId) => {
    setExpandedClassroom(prev => prev === classroomId ? null : classroomId);
  }, []);

const onToggleTeacherAttendance = useCallback(async () => {
  setAttError("");

  try {
    setAttBusy(true);

    const coords = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          console.log("Actual GPS Location:", {
            latitude,
            longitude,
          });

          resolve({
            latitude,
            longitude,
          });
        },
        (error) => {
          console.error("GPS Error:", error);

          if (error.code === 1) {
            reject(new Error("Location permission denied. Please allow GPS location."));
          } else if (error.code === 2) {
            reject(new Error("Unable to get GPS location."));
          } else if (error.code === 3) {
            reject(new Error("GPS location request timed out. Please try again."));
          } else {
            reject(new Error("Unable to get GPS location."));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });

    console.log("Sending GPS coordinates:", coords);

    const res = await markTeacherAttendance(coords);

    await refreshProfile();

    toast.success(
      res?.message ||
        (isLoggedInToday && !hasLoggedOut
          ? "Logout successful"
          : "Login successful")
    );
  } catch (e) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Failed to update attendance";

    setAttError(msg);
    toast.error(msg);
  } finally {
    setAttBusy(false);
  }
}, [refreshProfile, isLoggedInToday, hasLoggedOut]);

  return (
    // COMPACT CHANGE: Reduced padding from p-4 sm:p-6 to p-3 sm:p-4
    <div className="p-3 sm:p-4 font-sans">
      {/* Profile Header */}
      {/* COMPACT CHANGE: Reduced border-radius from rounded-2xl to rounded-xl */}
      {/* COMPACT CHANGE: Reduced padding from p-4 sm:p-6 to p-3 sm:p-4 */}
      {/* COMPACT CHANGE: Reduced margin-bottom from mb-6 to mb-4 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 relative mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* COMPACT CHANGE: Reduced avatar size from w-12 h-12 sm:w-14 sm:h-14 to w-10 h-10 sm:w-12 sm:h-12 */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile?.user_assets?.profile?.[0] ? (
                <img src={profile.user_assets.profile[0]} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              {/* COMPACT CHANGE: Reduced font size from text-xl sm:text-2xl to text-lg sm:text-xl */}
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{greeting}, {profile?.first_name} {profile?.last_name}</h1>
              {/* COMPACT CHANGE: Reduced font size from text-sm sm:text-base to text-xs sm:text-sm */}
              <p className="text-gray-600 text-xs sm:text-sm mt-0.5">Here's your overview for {todayLabel}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {/* COMPACT CHANGE: Reduced padding from p-2 to p-1.5 */}
            {/* COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg */}
            <div className="flex items-center gap-2 p-1.5 rounded-lg border border-gray-200 bg-white shadow-sm w-full sm:w-auto">
              {/* COMPACT CHANGE: Reduced font size */}
              <div className="text-xs flex-1">
                <div className="text-gray-700 font-semibold">In: <span className="font-normal">{todayAttendance?.in_time ? formatTime(todayAttendance.in_time) : '-'}</span></div>
                <div className="text-gray-700 font-semibold">Out: <span className="font-normal">{todayAttendance?.out_time ? formatTime(todayAttendance.out_time) : '-'}</span></div>
              </div>
              <button
                onClick={onToggleTeacherAttendance}
                disabled={attBusy}
                // COMPACT CHANGE: Reduced padding from px-3 py-2 to px-2.5 py-1.5
                // COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg
                // COMPACT CHANGE: Reduced font size from text-sm to text-xs
                className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isLoggedInToday && !hasLoggedOut
                  ? "bg-gray-300 text-gray-700"
                  : "bg-[#f86730] text-white hover:bg-[#e55a29]"
                  } flex-shrink-0`}
                title={isLoggedInToday && !hasLoggedOut ? "Logout" : "Login"}
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-lg bg-white/15">
                  {isLoggedInToday && !hasLoggedOut ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  )}
                </span>
                <span>{isLoggedInToday && !hasLoggedOut ? "Logout" : "Login"}</span>
              </button>
            </div>
            {/* COMPACT CHANGE: Reduced padding from p-3 to p-2 */}
            {/* COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg */}
            <button onClick={toggleNotifDrawer} className="relative p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200">
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{unreadCount}</span>
              )}
            </button>
          </div>
        </div>
        {attError && (
          // COMPACT CHANGE: Reduced padding from p-3 to p-2
          <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{attError}</div>
        )}
      </div>

      {/* Notifications Drawer */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0"
            onClick={closeNotifDrawer}
          />
          <div className="relative w-full sm:max-w-md md:max-w-lg h-full bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out translate-x-0">
            <div className="h-full flex flex-col">
              {/* COMPACT CHANGE: Reduced padding from px-6 py-4 to px-4 py-3 */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
                {/* COMPACT CHANGE: Reduced font size from text-xl to text-lg */}
                <div className="font-bold text-gray-900 text-lg">Notifications</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 font-medium">Unread: {unreadCount}</span>
                  <button
                    onClick={onMarkAllRead}
                    disabled={notifBulkBusy || unreadCount === 0}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors duration-200"
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={closeNotifDrawer}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    aria-label="Close notifications"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {(notifications || []).length === 0 ? (
                  <div className="p-4 text-xs text-gray-500 text-center font-medium">No notifications</div>
                ) : (
                  notifications.map((n) => {
                    const expanded = expandedNotifId === n.notification_id;
                    const fullMsg = String(n.message ?? "");
                    return (
                      // COMPACT CHANGE: Reduced padding from p-4 to p-3
                      <div key={n.notification_id} className={`p-3 ${n.is_read ? "bg-white" : "bg-blue-50"} hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0`}>
                        <div className="flex gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${n.is_read ? "bg-gray-300" : "bg-blue-500"}`} />
                          <div className="min-w-0 flex-1">
                            <div
                              className="flex items-start justify-between gap-3 cursor-pointer select-none"
                              onClick={() => setExpandedNotifId(expanded ? null : n.notification_id)}
                              role="button"
                              aria-expanded={expanded}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {n.type_name && (
                                    <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                      {String(n.type_name).replaceAll('_', ' ')}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-500 font-medium">{timeAgo(n.created_at)}</span>
                                </div>
                                {/* COMPACT CHANGE: Reduced font size from text-base to text-sm */}
                                <div className="font-semibold text-gray-900 text-sm truncate">{n.title || "Notification"}</div>
                                {!expanded && (
                                  <div className="text-xs text-gray-700 mt-0.5 line-clamp-1">
                                    {fullMsg}
                                  </div>
                                )}
                              </div>
                              <div className={`mt-1 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                            {expanded && (
                              <div className="mt-2">
                                <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{fullMsg}</div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <button
                                    onClick={() => setExpandedNotifId(null)}
                                    className="text-xs font-semibold text-blue-600 hover:underline"
                                  >
                                    Collapse
                                  </button>
                                  <button
                                    onClick={() => onToggleRead(n)}
                                    disabled={notifBusyIds.has(n.notification_id)}
                                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors duration-200 ${n.is_read
                                      ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                                      : "border-blue-600 text-blue-600 hover:bg-blue-50"
                                      } disabled:opacity-50`}
                                  >
                                    {n.is_read ? "Mark unread" : "Mark read"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        // COMPACT CHANGE: Reduced padding from p-4 to p-3
        // COMPACT CHANGE: Reduced margin-bottom from mb-6 to mb-4
        // COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium">{error}</div>
      )}

      {/* KPI Summary */}
      {/* COMPACT CHANGE: Reduced gap from gap-4 sm:gap-6 to gap-3 sm:gap-4 */}
      {/* COMPACT CHANGE: Reduced margin-bottom from mb-6 to mb-4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
        {/* COMPACT CHANGE: Reduced border-radius from rounded-2xl to rounded-xl */}
        {/* COMPACT CHANGE: Reduced padding from p-4 sm:p-6 to p-3 sm:p-4 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs text-gray-500 font-medium">My Classes</div>
          {/* COMPACT CHANGE: Reduced font size from text-2xl to text-xl */}
          <div className="mt-0.5 text-xl font-bold text-gray-900">{classrooms.length}</div>
          <div className="mt-1 text-[10px] text-gray-500">Total active sections</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs text-gray-500 font-medium">Pending Assignments</div>
          <div className="mt-0.5 text-xl font-bold text-gray-900">{pendingAssignments.pending}</div>
          <div className="mt-1 text-[10px] text-gray-500">Submissions due</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs text-gray-500 font-medium">Upcoming Exams</div>
          <div className="mt-0.5 text-xl font-bold text-gray-900">{exams.length}</div>
          <div className="mt-1 text-[10px] text-gray-500">Within your schedule</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4">
        {/* Today's Schedule */}
        {/* COMPACT CHANGE: Reduced border-radius from rounded-2xl to rounded-xl */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* COMPACT CHANGE: Reduced padding from px-4 sm:px-6 py-4 to px-3 sm:px-4 py-3 */}
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* COMPACT CHANGE: Reduced font size from text-lg sm:text-xl to text-base sm:text-lg */}
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Today's Schedule</h2>
            <span className="text-xs text-gray-600 font-medium">{todayLabel}</span>
          </div>
          {/* COMPACT CHANGE: Reduced padding from p-4 sm:p-6 to p-3 sm:p-4 */}
          <div className="p-3 sm:p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : timetable.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-6 font-medium">No periods scheduled today.</div>
            ) : (
              <div className="space-y-3">
                {timetable.map((p, i) => (
                  // COMPACT CHANGE: Reduced padding from p-4 to p-3
                  // COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-gray-200 rounded-lg gap-2 sm:gap-3 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* COMPACT CHANGE: Reduced padding from px-3 py-1.5 to px-2 py-1 */}
                      <div className="px-2 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-semibold flex-shrink-0">Period {p.period_number}</div>
                      <div className="min-w-0 flex-1">
                        {/* COMPACT CHANGE: Reduced font size from text-base to text-sm */}
                        <div className="font-semibold text-gray-900 text-sm truncate">{p.subject || (p.is_break ? "Break" : "Free")}</div>
                        <div className="text-xs text-gray-600 truncate mt-0.5">{p.class_name}{p.section_name ? ` • Sec ${p.section_name}` : ""}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {/* COMPACT CHANGE: Reduced font size from text-sm to text-xs */}
                      <div className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                        {formatTime(p.start_time)} - {formatTime(p.end_time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages & Announcements */}
        {/* COMPACT CHANGE: Reduced border-radius from rounded-2xl to rounded-xl */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* COMPACT CHANGE: Reduced padding from px-4 sm:px-6 py-4 to px-3 sm:px-4 py-3 */}
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
            {/* COMPACT CHANGE: Reduced font size from text-lg sm:text-xl to text-base sm:text-lg */}
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Messages & Announcements</h2>
          </div>
          {/* COMPACT CHANGE: Reduced padding from p-4 sm:p-6 to p-3 sm:p-4 */}
          <div className="p-3 sm:p-4 space-y-3 max-h-[340px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-6 font-medium">No announcements</div>
            ) : (
              announcements.slice(0, 5).map((a) => (
                // COMPACT CHANGE: Reduced padding from p-4 to p-3
                // COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg
                <div key={a.announcement_id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                  {/* COMPACT CHANGE: Reduced font size from text-base to text-sm */}
                  <div className="font-semibold text-gray-900 text-sm truncate mb-1.5">{a.title}</div>
                  <div className="text-xs text-gray-700 line-clamp-2 leading-relaxed mb-2">{a.content}</div>
                  <div className="text-[10px] text-gray-500 font-medium">{a.created_at}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 mb-4">
        {/* My Classes Overview */}
        {/* COMPACT CHANGE: Reduced border-radius from rounded-2xl to rounded-xl */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          {/* COMPACT CHANGE: Reduced padding from px-5 py-4 to px-3 sm:px-4 py-3 */}
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
            {/* COMPACT CHANGE: Reduced font size from text-lg sm:text-xl to text-base sm:text-lg */}
            <h2 className="text-base sm:text-lg font-bold text-gray-900">My Classes Overview</h2>
          </div>
          {/* COMPACT CHANGE: Reduced padding from p-5 to p-3 sm:p-4 */}
          {/* COMPACT CHANGE: Reduced gap from gap-4 to gap-3 */}
          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : classrooms.length === 0 ? (
              <div className="col-span-full text-xs text-gray-500 text-center py-6 font-medium">No classrooms assigned.</div>
            ) : (
              classrooms.map((c) => (
                // COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg
                // COMPACT CHANGE: Reduced padding from p-4 to p-3
                <div key={c.classroom_id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    {/* COMPACT CHANGE: Reduced font size from text-base to text-sm */}
                    <div className="font-semibold text-gray-900 text-sm truncate">{c.class_name} • Sec {c.section_name}</div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0 font-medium">ID: {c.classroom_id}</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-3 font-medium">Students: {classStudentsMap[c.classroom_id] ?? "-"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.subjectList || []).slice(0, expandedClassroom === c.classroom_id ? c.subjectList.length : 3).map((s) => (
                      <span key={s.subject_id} className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 font-medium truncate max-w-[100px]">
                        {s.subject_name}
                      </span>
                    ))}
                    {(c.subjectList || []).length > 3 && expandedClassroom !== c.classroom_id && (
                      <button
                        onClick={() => toggleSubjectExpansion(c.classroom_id)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-200 text-gray-600 font-medium hover:bg-gray-300 transition-colors duration-150"
                      >
                        +{(c.subjectList || []).length - 3} more
                      </button>
                    )}
                    {expandedClassroom === c.classroom_id && (c.subjectList || []).length > 3 && (
                      <button
                        onClick={() => toggleSubjectExpansion(c.classroom_id)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-200 text-gray-600 font-medium hover:bg-gray-300 transition-colors duration-150"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assignments Summary */}
        {/* COMPACT CHANGE: Reduced border-radius from rounded-2xl to rounded-xl */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* COMPACT CHANGE: Reduced padding from px-5 py-4 to px-3 sm:px-4 py-3 */}
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
            {/* COMPACT CHANGE: Reduced font size from text-lg sm:text-xl to text-base sm:text-lg */}
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Assignments Summary</h2>
          </div>
          {/* COMPACT CHANGE: Reduced padding from p-5 to p-3 sm:p-4 */}
          <div className="p-3 sm:p-4 space-y-3">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-6 font-medium">No assignments created yet.</div>
            ) : (
              <>
                {/* COMPACT CHANGE: Reduced padding from p-4 to p-3 */}
                {/* COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-xs text-gray-700 font-medium">Pending submissions</span>
                  <span className="text-base font-bold text-gray-900">{pendingAssignments.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-xs text-gray-700 font-medium">Recently graded</span>
                  <span className="text-base font-bold text-gray-900">{pendingAssignments.recentlyGraded}</span>
                </div>
                <div className="space-y-2 pt-2">
                  {assignments.slice(0, 5).map((a) => (
                    // COMPACT CHANGE: Reduced padding from p-4 to p-3
                    // COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg
                    <div key={a.assignment_id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                      {/* COMPACT CHANGE: Reduced font size from text-base to text-sm */}
                      <div className="font-semibold text-gray-900 text-sm truncate mb-1">{a.title}</div>
                      <div className="text-[10px] text-gray-600 font-medium">Class {a.class_name} • Sec {a.section_name} • Due {a.due_date}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Attendance Overview */}
        {/* COMPACT CHANGE: Reduced border-radius from rounded-2xl to rounded-xl */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* COMPACT CHANGE: Reduced padding from px-5 py-4 to px-3 sm:px-4 py-3 */}
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
            {/* COMPACT CHANGE: Reduced font size from text-lg sm:text-xl to text-base sm:text-lg */}
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Attendance Overview (Today)</h2>
          </div>
          {/* COMPACT CHANGE: Reduced padding from p-5 to p-3 sm:p-4 */}
          <div className="p-3 sm:p-4 space-y-3 max-h-[280px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : classrooms.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-6 font-medium">No classrooms assigned.</div>
            ) : (
              classrooms.map((c) => (
                // COMPACT CHANGE: Reduced padding from p-4 to p-3
                // COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg
                <div key={`${c.classroom_id}-${c.section_id}`} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg gap-3 hover:bg-gray-50 transition-colors duration-150">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm truncate">{c.class_name} • Sec {c.section_name}</div>
                    <div className="text-[10px] text-gray-600 font-medium mt-0.5">Students: {classStudentsMap[c.classroom_id] ?? "-"}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0 ${attendanceToday[c.classroom_id]
                    ? "bg-[#e8f8f0] text-[#0f9d58] border border-[#b7ebd0]"
                    : "bg-[#fff3ed] text-[#f86730] border border-[#ffd3bf]"
                    }`}>
                    {attendanceToday[c.classroom_id] ? "Taken" : "Pending"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        {/* COMPACT CHANGE: Reduced border-radius from rounded-2xl to rounded-xl */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* COMPACT CHANGE: Reduced padding from px-5 py-4 to px-3 sm:px-4 py-3 */}
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
            {/* COMPACT CHANGE: Reduced font size from text-lg sm:text-xl to text-base sm:text-lg */}
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Upcoming Events & Deadlines</h2>
            <span className="text-[10px] text-gray-500 flex-shrink-0 font-medium bg-gray-100 px-1.5 py-0.5 rounded-lg">Exams</span>
          </div>
          {/* COMPACT CHANGE: Reduced padding from p-5 to p-3 sm:p-4 */}
          <div className="p-3 sm:p-4 space-y-3 max-h-[280px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : exams.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-6 font-medium">No upcoming exams.</div>
            ) : (
              exams.slice(0, 5).map((e) => (
                // COMPACT CHANGE: Reduced padding from p-4 to p-3
                // COMPACT CHANGE: Reduced border-radius from rounded-xl to rounded-lg
                <div key={e.scheduler_id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                  <div className="font-semibold text-gray-900 text-sm truncate mb-1">{e.subject_name} • {e.exam_name}</div>
                  <div className="text-[10px] text-gray-600 font-medium">
                    {e.class_name} • Sec {e.section_name} • {e.exam_date} • {formatTime(e.start_time)}-{formatTime(e.end_time)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ticket Analytics Section */}
      {/* COMPACT CHANGE: Reduced margin-top from mt-8 to mt-4 */}
      <div className="mt-4">
        {/* COMPACT CHANGE: Reduced border-radius from rounded-2xl to rounded-xl */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* COMPACT CHANGE: Reduced padding from px-5 py-4 to px-3 sm:px-4 py-3 */}
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                {/* COMPACT CHANGE: Reduced font size from text-xl to text-base sm:text-lg */}
                <h2 className="text-base sm:text-lg font-bold text-gray-800">Ticket Analytics</h2>
                {/* COMPACT CHANGE: Reduced font size from text-sm to text-xs */}
                <p className="text-xs text-gray-600 mt-0.5">Overview of ticket statistics and trends</p>
              </div>
              <div className="flex items-center text-xs text-blue-600 font-medium">
                <span>Last Updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="p-1">
            <TicketAnalytics />
          </div>
        </div>
      </div>
    </div>
  );
}