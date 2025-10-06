import { useEffect, useMemo, useState } from "react";
import { reportPreview, reportGenerate, reportList } from "../Utility/reportApi";

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [schedulerIds, setSchedulerIds] = useState("");
  const [studentIds, setStudentIds] = useState("");
  const [termLabel, setTermLabel] = useState("");
  const [publish, setPublish] = useState(false);

  const [previewRows, setPreviewRows] = useState([]);
  const [listRows, setListRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_records: 0, limit: 10 });

  function parseIds(input) {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((n) => Number(n))
      .filter((n) => !Number.isNaN(n));
  }

  async function doPreview() {
    try {
      setLoading(true);
      setError("");
      const body = {
        classroom_id: Number(classroomId),
        scheduler_ids: parseIds(schedulerIds),
        ...(studentIds ? { student_ids: parseIds(studentIds) } : {}),
        ...(termLabel ? { term_label: termLabel } : {}),
      };
      const res = await reportPreview(body);
      const list = Array.isArray(res?.resources?.data) ? res.resources.data : [];
      setPreviewRows(list);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function doGenerate() {
    try {
      setLoading(true);
      setError("");
      const body = {
        classroom_id: Number(classroomId),
        scheduler_ids: parseIds(schedulerIds),
        ...(studentIds ? { student_ids: parseIds(studentIds) } : {}),
        ...(termLabel ? { term_label: termLabel } : {}),
        publish: publish ? 1 : 0,
      };
      await reportGenerate(body);
      await loadList(1);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Generate failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadList(p = page) {
    try {
      setLoading(true);
      setError("");
      const res = await reportList({ page: p, limit, ...(classroomId ? { classroom_id: Number(classroomId) } : {}), ...(termLabel ? { term_label: termLabel } : {}), });
      const list = Array.isArray(res?.resources?.data) ? res.resources.data : [];
      setListRows(list);
      const pg = res?.resources?.pagination;
      if (pg) setPagination(pg);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Load reports failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadList(1); setPage(1); }, [classroomId, termLabel]);

  const previewCount = useMemo(() => previewRows.length, [previewRows]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-xs text-gray-600">Preview and generate student exam reports</p>
        </div>

        <div className="p-4 sm:p-5">
          {error && <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="font-semibold mb-3">Build Report</div>
              <div className="space-y-3">
                <input className="border rounded px-3 py-2 text-sm w-full" placeholder="Classroom ID" value={classroomId} onChange={(e) => setClassroomId(e.target.value)} />
                <input className="border rounded px-3 py-2 text-sm w-full" placeholder="Scheduler IDs (comma separated)" value={schedulerIds} onChange={(e) => setSchedulerIds(e.target.value)} />
                <input className="border rounded px-3 py-2 text-sm w-full" placeholder="Student IDs (comma separated, optional)" value={studentIds} onChange={(e) => setStudentIds(e.target.value)} />
                <input className="border rounded px-3 py-2 text-sm w-full" placeholder="Term label (e.g., Term 1)" value={termLabel} onChange={(e) => setTermLabel(e.target.value)} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish after generate</label>
                <div className="flex gap-2">
                  <button onClick={doPreview} disabled={loading} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border text-sm">Preview ({previewCount})</button>
                  <button onClick={doGenerate} disabled={loading} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 text-sm">Generate</button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="font-semibold mb-3">Generated Reports</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2 border-b">Report ID</th>
                      <th className="text-left px-3 py-2 border-b">Student</th>
                      <th className="text-left px-3 py-2 border-b">Class</th>
                      <th className="text-left px-3 py-2 border-b">Term</th>
                      <th className="text-left px-3 py-2 border-b">Published</th>
                      <th className="text-left px-3 py-2 border-b">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(6)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {Array.from({ length: 6 }).map((__, j) => (
                            <td key={j} className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded"/></td>
                          ))}
                        </tr>
                      ))
                    ) : listRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-500">No reports</td>
                      </tr>
                    ) : (
                      listRows.map((r) => (
                        <tr key={r.report_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border-b">{r.report_id}</td>
                          <td className="px-3 py-2 border-b">{r.student_name}</td>
                          <td className="px-3 py-2 border-b">{r.class_name} • {r.section_name}</td>
                          <td className="px-3 py-2 border-b">{r.term_label}</td>
                          <td className="px-3 py-2 border-b">{r.is_published ? "Yes" : "No"}</td>
                          <td className="px-3 py-2 border-b">
                            {r.pdf_path ? (
                              <a href={r.pdf_path} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open</a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="text-gray-600">Page {pagination.current_page} of {pagination.total_pages} • Total {pagination.total_records}</div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50" disabled={loading || pagination.current_page <= 1} onClick={() => { const p = pagination.current_page - 1; setPage(p); loadList(p); }}>Prev</button>
                  <button className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50" disabled={loading || pagination.current_page >= pagination.total_pages} onClick={() => { const p = pagination.current_page + 1; setPage(p); loadList(p); }}>Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
