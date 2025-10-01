import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { UserContext } from "../components/Provider";
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
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${period}`;
}

export default function Dashboard() {
  const { profile } = useContext(UserContext);

  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [classStudentsMap, setClassStudentsMap] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState({});
  const [exams, setExams] = useState([]);
  const [error, setError] = useState("");

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
      setNotifications(notificationsData);
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

  return (
    <div className="space-4 p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{greeting}, {profile?.first_name} {profile?.last_name}</h1>
              <p className="text-gray-600 text-sm">Here's your overview for {todayLabel}</p>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button className="relative p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{unreadCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 sm:p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Today's Schedule</h2>
            <span className="text-sm text-gray-500">{todayLabel}</span>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : timetable.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">No periods scheduled today.</div>
            ) : (
              <div className="space-y-3">
                {timetable.map((p, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-gray-200 rounded-lg gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold flex-shrink-0">Period {p.period_number}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{p.subject || (p.is_break ? "Break" : "Free")}</div>
                        <div className="text-sm text-gray-600 truncate">{p.class_name}{p.section_name ? ` • Sec ${p.section_name}` : ""}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatTime(p.start_time)} - {formatTime(p.end_time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Messages & Announcements</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-3 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">No announcements</div>
            ) : (
              announcements.slice(0, 5).map((a) => (
                <div key={a.announcement_id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{a.title}</div>
                  <div className="text-sm text-gray-700 line-clamp-2 mt-1">{a.content}</div>
                  <div className="text-xs text-gray-500 mt-2">{a.created_at}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">My Classes Overview</h2>
          </div>
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : classrooms.length === 0 ? (
              <div className="col-span-full text-sm text-gray-500 text-center py-4">No classrooms assigned.</div>
            ) : (
              classrooms.map((c) => (
                <div key={c.classroom_id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{c.class_name} • Sec {c.section_name}</div>
                    <span className="text-xs text-gray-600 flex-shrink-0">ID: {c.classroom_id}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">Students: {classStudentsMap[c.classroom_id] ?? "-"}</div>
                  <div className="flex flex-wrap gap-1">
                    {(c.subjectList || []).slice(0, 3).map((s) => (
                      <span key={s.subject_id} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800 truncate max-w-[100px]">{s.subject_name}</span>
                    ))}
                    {(c.subjectList || []).length > 3 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">+{(c.subjectList || []).length - 3} more</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Assignments Summary</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-3">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">No assignments created yet.</div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-700">Pending submissions</span>
                  <span className="text-base font-semibold text-gray-900">{pendingAssignments.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-700">Recently graded</span>
                  <span className="text-base font-semibold text-gray-900">{pendingAssignments.recentlyGraded}</span>
                </div>
                <div className="space-y-2 pt-2">
                  {assignments.slice(0, 5).map((a) => (
                    <div key={a.assignment_id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{a.title}</div>
                      <div className="text-xs text-gray-600 mt-1">Class {a.class_name} • Sec {a.section_name} • Due {a.due_date}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Attendance Overview (Today)</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-3 max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : classrooms.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">No classrooms assigned.</div>
            ) : (
              classrooms.map((c) => (
                <div key={`${c.classroom_id}-${c.section_id}`} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{c.class_name} • Sec {c.section_name}</div>
                    <div className="text-xs text-gray-600">Students: {classStudentsMap[c.classroom_id] ?? "-"}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded flex-shrink-0 ${attendanceToday[c.classroom_id] ? "bg-green-100 text-green-700 border border-green-200" : "bg-yellow-100 text-yellow-700 border border-yellow-200"}`}>
                    {attendanceToday[c.classroom_id] ? "Taken" : "Pending"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Upcoming Events & Deadlines</h2>
            <span className="text-xs text-gray-500 flex-shrink-0">Exams</span>
          </div>
          <div className="p-4 sm:p-5 space-y-3 max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : exams.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">No upcoming exams.</div>
            ) : (
              exams.slice(0, 5).map((e) => (
                <div key={e.scheduler_id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{e.subject_name} • {e.exam_name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {e.class_name} • Sec {e.section_name} • {e.exam_date} • {formatTime(e.start_time)}-{formatTime(e.end_time)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}