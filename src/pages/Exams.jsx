import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getTeacherExams } from "../Utility/examApi";
import { getTeacherClassrooms } from "../Utility/dashboardApi";

function formatDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return isNaN(d) ? String(dt) : d.toLocaleDateString();
}

export default function Exams() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [classOptions, setClassOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [range, setRange] = useState("upcoming");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0, limit });
  const [schedWithResults, setSchedWithResults] = useState(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((e) => {
      const matchesText = `${e.exam_name || ""} ${e.subject_name || ""} ${e.class_name || ""} ${e.section_name || ""}`.toLowerCase().includes(q);
      if (!matchesText) return false;
      if (selectedClassroom && String(e.classroom_id) !== String(selectedClassroom)) return false;
      return true;
    });
  }, [items, search, selectedClassroom, range]);

  async function load(p = page) {
    try {
      setLoading(true);
      setError("");
      const params = {
        page: p,
        limit,
        ...(selectedClassroom ? { classroom_id: Number(selectedClassroom) } : {}),
        // teacher API doesn't accept section_name; we filter client-side
        filter: range,
      };
      const res = await getTeacherExams(params);
      // backend: { status, code, message, resources: { data: { exams: [], pagination: {} } } }
      const list = Array.isArray(res?.resources?.data?.exams)
        ? res.resources.data.exams
        : [];
      const rows = list.map((r) => ({
        scheduler_id: r.scheduler_id,
        exam_id: r.exam_id,
        exam_name: r.exam_name || "Exam",
        exam_type: r.exam_type || "-",
        subject_id: r.subject_id,
        subject_name: r.subject_name || "-",
        classroom_id: r.classroom_id,
        class_name: r.class_name || "-",
        section_name: r.section_name || "-",
        exam_date: r.exam_date,
        start_time: r.start_time,
        end_time: r.end_time,
        total_marks: r.total_marks,
        pass_marks: r.pass_marks,
        room_number: r.room_number,
        session_name: r.session_name,
      }));
      setItems(rows);
      const pg = res?.resources?.data?.pagination;
      if (pg) setPagination(pg);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }

  // Load which scheduler_ids already have any results (for past exams banner/button)
  async function loadResultsPresence() {
    try {
      const limitR = 100; let p = 1; let totalPages = 1; const s = new Set();
      do {
        const r = await (await import("../Utility/examApi")).getExamResultsList({ page: p, limit: limitR });
        const list = Array.isArray(r?.resources?.data) ? r.resources.data : [];
        for (const row of list) if (row?.scheduler_id != null) s.add(Number(row.scheduler_id));
        const pg = r?.resources?.pagination; totalPages = Math.max(1, Number(pg?.total_pages || 1)); p += 1;
      } while (p <= totalPages && p <= 5);
      setSchedWithResults(s);
    } catch (_) {
      setSchedWithResults(new Set());
    }
  }

  useEffect(() => { load(1); setPage(1); }, [selectedClassroom, range, limit]);
  useEffect(() => { load(page); }, []);
  useEffect(() => { if (range === 'past') loadResultsPresence(); }, [range]);

  // Load class/section options for filters (from teacher/classrooms)
  useEffect(() => {
    (async () => {
      try {
        const res = await getTeacherClassrooms();
        const raw = Array.isArray(res?.resources?.data) ? res.resources.data : [];
        const classMap = new Map(); // key: class_id
        const sectionsByClassId = {}; // class_id -> [{ classroom_id, section_name }]
        raw.forEach((c) => {
          if (c.class_id != null) {
            classMap.set(String(c.class_id), { class_id: c.class_id, class_name: c.class_name });
            const secs = Array.isArray(c.sections) ? c.sections : [];
            if (!sectionsByClassId[c.class_id]) sectionsByClassId[c.class_id] = [];
            secs.forEach((s) => sectionsByClassId[c.class_id].push({ classroom_id: s.classroom_id, section_name: s.section_name }));
          }
        });
        setClassOptions(Array.from(classMap.values()).map(x => ({ value: x.class_id, label: x.class_name })));
        Exams._sectionsByClassId = sectionsByClassId;
      } catch (e) {
        // ignore filter options failure
      }
    })();
  }, []);

  // Update section options when class changes
  useEffect(() => {
    const map = Exams._sectionsByClassId || {};
    const arr = map[selectedClassId] || [];
    setSectionOptions(arr.map((s) => ({ value: s.classroom_id, label: `Sec ${s.section_name}` })));
    setSelectedClassroom("");
  }, [selectedClassId]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Exams</h1>
            <p className="text-xs text-gray-600">All scheduled exams assigned to you</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#f86730] focus:border-[#f86730] outline-none"
            >
              <option value="">All Classes</option>
              {classOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              disabled={!selectedClassId}
            >
              <option value="">All Sections</option>
              {sectionOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
            <input
              placeholder="Search exam, subject, class"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:ring-1 focus:ring-[#f86730] focus:border-[#f86730] outline-none"
            />
            <button onClick={() => { setPage(1); load(1); }} className="px-4 py-2 rounded-lg bg-[#f86730] hover:bg-[#e55a29] text-white text-sm font-medium transition-all duration-200 shadow-sm" disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#0F172A]/5 text-[#0F172A]">
                <tr>
                  <th className="text-left px-3 py-2">Exam</th>
                  <th className="text-left px-3 py-2">Subject</th>
                  <th className="text-left px-3 py-2">Class</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Max</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Pass</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-500 text-sm">No exams found</td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.scheduler_id} className="hover:bg-[#f86730]/5 odd:bg-white even:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 font-semibold text-[#0F172A]">{e.exam_name}</td>
                      <td className="px-3 py-2">{e.subject_name}</td>
                      <td className="px-3 py-2">{e.class_name} • {e.section_name}</td>
                      <td className="px-3 py-2">{formatDate(e.exam_date)}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">{e.total_marks ?? '-'}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">{e.pass_marks ?? '-'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          {range === 'past' && (
                            <>
                              <Link to={`/results/${e.scheduler_id}`} className="px-3 py-2 rounded-lg border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white text-xs font-medium transition-all">
                                View Results
                              </Link>
                              {(() => {
                                const hasResults = schedWithResults.has(Number(e.scheduler_id));
                                const baseCls = hasResults
                                  ? 'bg-green-600 hover:bg-green-700 border-green-600'
                                  : 'bg-[#f86730] hover:bg-[#e55a29] border-[#f86730]';
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/exams/${e.scheduler_id}/entry`, {
                                        state: { scheduler_id: e.scheduler_id, exam_id: e.exam_id, subject_id: e.subject_id, classroom_id: e.classroom_id }
                                      });
                                    }}
                                   className={`w-40 h-9 rounded-lg text-white border text-sm font-medium transition-all duration-200 flex items-center justify-center whitespace-nowrap ${baseCls}`}
                                  >
                                    {hasResults ? 'Marks Assigned' : 'Assign Marks'}
                                  </button>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-gray-600">Page {pagination.page} of {pagination.total_pages} • Total {pagination.total}</div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-[#f86730] text-[#f86730] hover:bg-[#f86730] hover:text-white text-sm font-medium transition-all disabled:opacity-50"
                disabled={loading || pagination.page <= 1}
                onClick={() => { const p = pagination.page - 1; setPage(p); load(p); }}
              >
                Prev
              </button>
              <button
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                disabled={loading || pagination.page >= pagination.total_pages}
                onClick={() => { const p = pagination.page + 1; setPage(p); load(p); }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
