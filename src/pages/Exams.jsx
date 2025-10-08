import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTeacherExams } from "../Utility/examApi";
import { getTeacherClassrooms } from "../Utility/attendanceApi";

function formatDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d)) return String(dt);
  return d.toLocaleDateString();
}

export default function Exams() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const [classOptions, setClassOptions] = useState([]); // {classroom_id, label}
  const [sectionOptions, setSectionOptions] = useState([]); // derived from class selection
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [range, setRange] = useState("all"); // all | upcoming | past
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0, limit });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const today = new Date(); today.setHours(0,0,0,0);
    return items.filter((e) => {
      // text search
      const matchesText = `${e.exam_name || ""} ${e.subject_name || ""} ${e.class_name || ""} ${e.section_name || ""}`.toLowerCase().includes(q);
      if (!matchesText) return false;
      // class/section filters
      if (selectedClassroom && String(e.classroom_id) !== String(selectedClassroom)) return false;
      if (selectedSection && String(e.section_name) !== String(selectedSection)) return false; // section filter by name since we have section_name
      // date range filter
      if (range !== "all") {
        const d = e.exam_date ? new Date(e.exam_date) : null;
        if (d && !isNaN(d)) {
          d.setHours(0,0,0,0);
          if (range === "upcoming" && d < today) return false;
          if (range === "past" && d >= today) return false;
        }
      }
      return true;
    });
  }, [items, search, selectedClassroom, selectedSection, range]);

  async function load(p = page) {
    try {
      setLoading(true);
      setError("");
      const params = {
        page: p,
        limit,
        ...(selectedClassroom ? { classroom_id: Number(selectedClassroom) } : {}),
        ...(selectedSection ? { section_name: selectedSection } : {}),
        ...(range !== "all" ? { filter: range } : {}),
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

  useEffect(() => { load(1); setPage(1); }, [selectedClassroom, selectedSection, range, limit]);
  useEffect(() => { load(page); }, []);

  // Load class/section options for filters
  useEffect(() => {
    (async () => {
      try {
        const res = await getTeacherClassrooms();
        const raw = Array.isArray(res?.resources?.data) ? res.resources.data : [];
        const classes = [];
        const sectionsByClass = {};
        raw.forEach((cls) => {
          const sec = Array.isArray(cls.sections) ? cls.sections : [];
          sec.forEach((s) => {
            classes.push({
              classroom_id: s.classroom_id,
              class_name: cls.class_name,
              section_name: s.section_name,
            });
            if (!sectionsByClass[s.classroom_id]) sectionsByClass[s.classroom_id] = new Set();
            sectionsByClass[s.classroom_id].add(s.section_name);
          });
        });
        // Unique classes by classroom_id
        const uniqueClasses = Object.values(classes.reduce((acc, c) => {
          if (!acc[c.classroom_id]) acc[c.classroom_id] = c;
          return acc;
        }, {}));
        setClassOptions(uniqueClasses.map((c) => ({ value: c.classroom_id, label: `${c.class_name}` })));
        // store sections map in state via closure
        setSectionOptions((prev) => prev); // no-op init; will compute when class changes
        // attach map to component via ref alternative
        (Exams._sectionsByClass = sectionsByClass);
      } catch (e) {
        // ignore filter options failure
      }
    })();
  }, []);

  // Update section options when classroom changes
  useEffect(() => {
    const map = Exams._sectionsByClass || {};
    const set = map[selectedClassroom] || new Set();
    setSectionOptions(Array.from(set).map((name) => ({ value: name, label: `Sec ${name}` })));
    setSelectedSection("");
  }, [selectedClassroom]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Exams</h1>
            <p className="text-xs text-gray-600">All scheduled exams assigned to you</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Classes</option>
              {classOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              disabled={!selectedClassroom}
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
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
            <input
              placeholder="Search exam, subject, class"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
            />
            <button onClick={() => { setPage(1); load(1); }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm" disabled={loading}>
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
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2">Exam</th>
                  <th className="text-left px-3 py-2">Subject</th>
                  <th className="text-left px-3 py-2">Class</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Max</th>
                  <th className="text-left px-3 py-2">Pass</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded"/></td>
                      <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded"/></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">No exams found</td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.scheduler_id} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{e.exam_name}</td>
                      <td className="px-3 py-2">{e.subject_name}</td>
                      <td className="px-3 py-2">{e.class_name} • {e.section_name}</td>
                      <td className="px-3 py-2">{formatDate(e.exam_date)}</td>
                      <td className="px-3 py-2">{e.total_marks ?? '-'}</td>
                      <td className="px-3 py-2">{e.pass_marks ?? '-'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Link to={`/results/${e.scheduler_id}`} className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-xs">
                            View Results
                          </Link>
                          <Link
                            to={`/exams/${e.scheduler_id}/entry`}
                            state={{ scheduler_id: e.scheduler_id, exam_id: e.exam_id, subject_id: e.subject_id, classroom_id: e.classroom_id }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-xs"
                          >
                            Assign Marks
                          </Link>
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
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
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
