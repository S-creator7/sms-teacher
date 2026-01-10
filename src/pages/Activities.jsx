import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { getClassActivityList, getClassroomActivities, getStudentActivities } from "../Utility/activityApi";

function useApiData(fetcher, deps = []) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetcher();
        const arr = Array.isArray(res?.resources?.data)
          ? res.resources.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        if (mounted) setData(arr);
      } catch (e) {
        if (mounted) setError(e);
        toast.error(e?.response?.data?.message || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { loading, data, error, setData };
}

export default function Activities() {
  // Left: classes and totals
  const { loading: classesLoading, data: classList } = useApiData(() => getClassActivityList(), []);

  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("assigned_desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Right: activities for selected classroom
  const {
    loading: activitiesLoading,
    data: activities,
    setData: setActivities,
  } = useApiData(
    () => (selectedClassroom ? getClassroomActivities(selectedClassroom.classroom_id) : Promise.resolve({ data: [] })),
    [selectedClassroom?.classroom_id]
  );

  // Student modal
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentActivities, setStudentActivities] = useState([]);
  const [studentMeta, setStudentMeta] = useState(null);

  useEffect(() => {
    if (!selectedClassroom && Array.isArray(classList) && classList.length) {
      setSelectedClassroom(classList[0]);
    }
  }, [classList, selectedClassroom]);

  const preparedActivities = useMemo(() => {
    return (activities || []).map((a) => {
      const rawStatus = a?.activity_status;
      const statusLabel =
        rawStatus === 1 || rawStatus === "1" || String(rawStatus || "").toLowerCase() === "active"
          ? "Active"
          : rawStatus === 0 || rawStatus === "0"
          ? "Inactive"
          : String(rawStatus || "-");
      const assignedMs = a?.assigned_date ? Date.parse(a.assigned_date) || 0 : 0;
      return { ...a, statusLabel, assignedMs };
    });
  }, [activities]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy, selectedClassroom]);

  const filteredSortedActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = preparedActivities;
    if (statusFilter !== "all") {
      arr = arr.filter((a) => a.statusLabel === statusFilter);
    }
    if (q) {
      arr = arr.filter((a) =>
        [
          a.title,
          a.description,
          a.activity_type,
          a.session_name,
          a.student_name,
          a.admission_number,
          a.role,
          a.achievement,
          a.statusLabel,
        ]
          .map((x) => String(x || "").toLowerCase())
          .some((v) => v.includes(q))
      );
    }
    const sorted = [...arr];
    if (sortBy === "assigned_desc") sorted.sort((a, b) => (b.assignedMs || 0) - (a.assignedMs || 0));
    else if (sortBy === "assigned_asc") sorted.sort((a, b) => (a.assignedMs || 0) - (b.assignedMs || 0));
    else if (sortBy === "name_asc") sorted.sort((a, b) => String(a.student_name || "").localeCompare(String(b.student_name || "")));
    else if (sortBy === "name_desc") sorted.sort((a, b) => String(b.student_name || "").localeCompare(String(a.student_name || "")));
    return sorted;
  }, [preparedActivities, search, statusFilter, sortBy]);

  const total = filteredSortedActivities.length;
  const paginatedActivities = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSortedActivities.slice(start, start + pageSize);
  }, [filteredSortedActivities, page, pageSize]);

  const summary = useMemo(() => {
    const all = preparedActivities;
    const uniqueStudents = new Set(all.map((x) => x.student_id)).size;
    const lastAssigned = all.reduce((m, x) => Math.max(m, x.assignedMs || 0), 0);
    return { total: all.length, uniqueStudents, lastAssigned };
  }, [preparedActivities]);

  async function openStudentHistory(student) {
    try {
      setStudentLoading(true);
      setShowStudentModal(true);
      setStudentMeta(student);
      const res = await getStudentActivities(student.student_id);
      const arr = Array.isArray(res?.resources?.data)
        ? res.resources.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setStudentActivities(arr);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load student activities");
      setStudentActivities([]);
    } finally {
      setStudentLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 font-sans text-base text-black">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Academic Activities</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search in activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 sm:flex-none w-full sm:w-72 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            disabled={!selectedClassroom}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="text-lg font-semibold text-gray-800">Classrooms</div>
            <div className="text-sm text-gray-600">Select a class to view activities</div>
          </div>
          <div className="p-4">
            {classesLoading ? (
              <div className="text-sm text-gray-500">Loading classes...</div>
            ) : classList?.length ? (
              <div className="flex gap-2 overflow-x-auto -m-2 p-2">
                {classList.map((c) => {
                  const active = selectedClassroom?.classroom_id === c.classroom_id;
                  return (
                    <button
                      key={c.classroom_id}
                      onClick={() => setSelectedClassroom(c)}
                      className={`shrink-0 px-4 py-2 rounded-full border text-sm transition ${
                        active
                          ? "bg-blue-600 text-white border-blue-600 shadow"
                          : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">{c.class_name} - {c.section_name}</span>
                      <span className="ml-2 text-xs opacity-80">{c.total_activities} Activities</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No classes found</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Total Activities</div>
            <div className="text-2xl font-semibold text-gray-800 mt-1">{summary.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Unique Students</div>
            <div className="text-2xl font-semibold text-gray-800 mt-1">{summary.uniqueStudents}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500">Latest Assigned</div>
            <div className="text-base font-medium text-gray-800 mt-1">{summary.lastAssigned ? new Date(summary.lastAssigned).toLocaleString() : "-"}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="text-lg font-semibold text-gray-800">
                {selectedClassroom ? `Classroom Activities - ${selectedClassroom.class_name} ${selectedClassroom.section_name}` : "Select a class to view activities"}
              </div>
              {selectedClassroom && (
                <div className="flex flex-wrap gap-2">
                  <select
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <select
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="assigned_desc">Newest Assigned</option>
                    <option value="assigned_asc">Oldest Assigned</option>
                    <option value="name_asc">Student A-Z</option>
                    <option value="name_desc">Student Z-A</option>
                  </select>
                  <button
                    className="text-sm px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
                    onClick={async () => {
                      try {
                        if (!selectedClassroom) return;
                        const res = await getClassroomActivities(selectedClassroom.classroom_id);
                        const arr = Array.isArray(res?.resources?.data)
                          ? res.resources.data
                          : Array.isArray(res?.data)
                          ? res.data
                          : [];
                        setActivities(arr);
                      } catch (e) {
                        toast.error(e?.response?.data?.message || "Refresh failed");
                      }
                    }}
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            {!selectedClassroom ? (
              <div className="text-sm text-gray-500">Choose a class above to view activities.</div>
            ) : activitiesLoading ? (
              <div className="text-sm text-gray-500">Loading activities...</div>
            ) : total ? (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-2 font-semibold text-gray-800">Student</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Admission</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Title</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Type</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Session</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Participation</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Achievement</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Role</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Status</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Assigned</th>
                        <th className="text-left p-2 font-semibold text-gray-800">Action</th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr]:transition-colors">
                      {paginatedActivities.map((a, idx) => (
                        <tr key={`${a.activity_id}-${idx}`} className={idx % 2 === 1 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-2">{a.student_name}</td>
                          <td className="p-2">{a.admission_number}</td>
                          <td className="p-2">{a.title}</td>
                          <td className="p-2">{a.activity_type}</td>
                          <td className="p-2">{a.session_name || "-"}</td>
                          <td className="p-2">{a.participation_date || "-"}</td>
                          <td className="p-2">{a.achievement || "-"}</td>
                          <td className="p-2">{a.role || "-"}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${a.statusLabel === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                              {a.statusLabel}
                            </span>
                          </td>
                          <td className="p-2">{a.assigned_date ? new Date(a.assigned_date).toLocaleString() : "-"}</td>
                          <td className="p-2">
                            <button
                              onClick={() => openStudentHistory({ student_id: a.student_id, student_name: a.student_name })}
                              className="px-3 py-1.5 rounded-md text-xs border bg-white hover:bg-gray-50"
                            >
                              View student history
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {paginatedActivities.map((a, idx) => (
                    <div key={`${a.activity_id}-${idx}`} className="rounded-xl border border-gray-200 p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-800">{a.student_name}</div>
                          <div className="text-xs text-gray-600">Admission: {a.admission_number}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${a.statusLabel === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{a.statusLabel}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Title:</span> {a.title}</div>
                        <div><span className="text-gray-500">Type:</span> {a.activity_type}</div>
                        <div><span className="text-gray-500">Session:</span> {a.session_name || "-"}</div>
                        <div><span className="text-gray-500">Participation:</span> {a.participation_date || "-"}</div>
                        <div><span className="text-gray-500">Achievement:</span> {a.achievement || "-"}</div>
                        <div><span className="text-gray-500">Role:</span> {a.role || "-"}</div>
                        <div className="col-span-2"><span className="text-gray-500">Assigned:</span> {a.assigned_date ? new Date(a.assigned_date).toLocaleString() : "-"}</div>
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={() => openStudentHistory({ student_id: a.student_id, student_name: a.student_name })}
                          className="w-full px-3 py-2 rounded-md text-xs border bg-white hover:bg-gray-50"
                        >
                          View student history
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-sm text-gray-600">
                    {(() => {
                      const start = (page - 1) * pageSize + 1;
                      const end = Math.min(page * pageSize, total);
                      return `Showing ${total ? start : 0}-${end} of ${total}`;
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={`px-3 py-2 rounded-md border text-sm ${page === 1 ? "text-gray-300 border-gray-200" : "hover:bg-gray-100"}`}
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}
                      disabled={page * pageSize >= total}
                      className={`px-3 py-2 rounded-md border text-sm ${page * pageSize >= total ? "text-gray-300 border-gray-200" : "hover:bg-gray-100"}`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">No activities found for this class</div>
            )}
          </div>
        </div>
      </div>

      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowStudentModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Student Activities</h3>
                <p className="text-sm text-gray-600">{studentMeta?.student_name}</p>
              </div>
              <button
                onClick={() => setShowStudentModal(false)}
                className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              {studentLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : studentActivities?.length ? (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-semibold text-gray-800">Title</th>
                      <th className="text-left p-2 font-semibold text-gray-800">Type</th>
                      <th className="text-left p-2 font-semibold text-gray-800">Session</th>
                      <th className="text-left p-2 font-semibold text-gray-800">Participation</th>
                      <th className="text-left p-2 font-semibold text-gray-800">Achievement</th>
                      <th className="text-left p-2 font-semibold text-gray-800">Role</th>
                      <th className="text-left p-2 font-semibold text-gray-800">Status</th>
                      <th className="text-left p-2 font-semibold text-gray-800">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentActivities.map((sa, idx) => (
                      <tr key={`${sa.activity_id}-${idx}`} className={idx % 2 === 1 ? "bg-gray-50" : "bg-white"}>
                        <td className="p-2">{sa.title}</td>
                        <td className="p-2">{sa.activity_type}</td>
                        <td className="p-2">{sa.session_name || "-"}</td>
                        <td className="p-2">{sa.participation_date || "-"}</td>
                        <td className="p-2">{sa.achievement || "-"}</td>
                        <td className="p-2">{sa.role || "-"}</td>
                        <td className="p-2">{String(sa.activity_status) === "1" || sa.activity_status === 1 ? "Active" : sa.activity_status || "-"}</td>
                        <td className="p-2">{sa.assigned_date ? new Date(sa.assigned_date).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-sm text-gray-500">No activities found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
