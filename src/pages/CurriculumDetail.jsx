import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { subjectDetailsApi } from "../Utility/curriculumApi";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function CurriculumDetail() {
  const { subjectId } = useParams();
  const query = useQuery();
  const class_id = query.get("class_id");
  const classroom_id = query.get("classroom_id");
  const class_name = query.get("class_name");
  const section_name = query.get("section_name");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]); // array of modules/chapters
  const navigate = useNavigate();

  useEffect(() => {
    if (!subjectId || !class_id || !classroom_id) return;
    (async () => {
      try {
        const res = await subjectDetailsApi({ subject_id: subjectId, class_id, classroom_id });
        // Dashboard uses an array directly at resources.data
        setRows(Array.isArray(res?.resources?.data) ? res.resources.data : []);
      } catch (e) {
        setError(e?.response?.data?.message || e.message || "Failed to load subject details");
        setRows([]);
      } finally { setLoading(false); }
    })();
  }, [subjectId, class_id, classroom_id]);

  return (
    <>
    <div className="p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200">
          <p className="text-xs text-gray-600">Chapters and topics with progress</p>
          {(class_name || section_name) && (
            <p className="text-xs text-gray-500 mt-1">Class: <span className="font-semibold text-gray-700">{class_name || '-'}</span> • Section: <span className="font-semibold text-gray-700">{section_name || '-'}</span></p>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          {/* Clicking a chapter opens topics page which shows its own cards */}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Chapter</th>
                  <th className="text-left px-3 py-2 border-b">Completion</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                      <td className="px-3 py-3 border-b"><div className="h-4 bg-gray-100 rounded" /></td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-500">No chapters found</td>
                  </tr>
                ) : (
                  rows.map((item, index) => (
                    <tr
                      key={item.module_id || index}
                      className="border-b cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        navigate(`/curriculum/chapter/${item.module_id}?subject_id=${encodeURIComponent(subjectId)}&class_id=${encodeURIComponent(class_id)}&classroom_id=${encodeURIComponent(classroom_id)}&module_name=${encodeURIComponent(item.module_name || '')}&class_name=${encodeURIComponent(class_name || '')}&section_name=${encodeURIComponent(section_name || '')}`)
                      }
                    >
                      <td className="px-3 py-2 font-medium">{item.module_name}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden max-w-[180px]">
                            <div className="h-3 bg-green-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(item.progress_percentage) || 0))}%` }} />
                          </div>
                          <span className="text-xs text-gray-700">{Math.max(0, Math.min(100, Number(item.progress_percentage) || 0))}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    {/* No modal on this page */}
  </>
  );
}
