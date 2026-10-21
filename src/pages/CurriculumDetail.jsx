import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { subjectDetailsApi } from "../Utility/curriculumApi";
import { getTeacherClassrooms } from "../Utility/attendanceApi";
import { FaArrowLeft } from "react-icons/fa";

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
  const [headerClassName, setHeaderClassName] = useState(class_name || "");
  const [headerSectionName, setHeaderSectionName] = useState(section_name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!subjectId || !class_id || !classroom_id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await subjectDetailsApi({ subject_id: subjectId, class_id, classroom_id });
        setRows(Array.isArray(res?.resources?.data) ? res.resources.data : []);
      } catch (e) {
        setError(e?.response?.data?.message || e.message || "Failed to load subject details");
        setRows([]);
      } finally { setLoading(false); }
    })();
  }, [subjectId, class_id, classroom_id]);

  useEffect(() => {
    (async () => {
      if (headerClassName && headerSectionName) return;
      try {
        if (!classroom_id) return;
        const res = await getTeacherClassrooms();
        const raw = Array.isArray(res?.resources?.data) ? res.resources.data : [];
        for (const cls of raw) {
          const cname = cls.class_name;
          const sections = Array.isArray(cls.sections) ? cls.sections : [];
          const found = sections.find((s) => String(s.classroom_id) === String(classroom_id));
          if (found) {
            if (!headerClassName) setHeaderClassName(cname || "");
            if (!headerSectionName) setHeaderSectionName(found.section_name || "");
            break;
          }
        }
      } catch (_) {}
    })();
  }, [classroom_id, headerClassName, headerSectionName]);

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
  <button
    onClick={() => navigate(-1)}
    className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 transition-colors"
  >
    <FaArrowLeft className="text-[#0F172A] text-sm" />
  </button>

  <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
    Chapter Progress
  </h1>
</div>
          <p className="text-sm text-gray-600 mb-2">Click on any chapter to view and manage topics</p>
          {(headerClassName || headerSectionName) && (
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-[#f86730]/10 text-[#f86730] px-2 py-1 rounded font-medium">
                Class: {headerClassName || '-'}
              </span>
              <span className="bg-[#0F172A]/10 text-[#0F172A] px-2 py-1 rounded font-medium">
                Section: {headerSectionName || '-'}
              </span>
            </div>
            
          )}
        </div>

        <div className="p-4 sm:p-6">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-5">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg font-medium">No chapters found</div>
                <div className="text-gray-400 text-sm mt-2">There are no chapters available for this subject</div>
              </div>
            ) : (
              rows.map((item, index) => (
                <div
                  key={item.module_id || index}
                  className="bg-white border border-gray-200 rounded-lg p-2 hover:border-[#f86730] hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() =>
                    navigate(`/curriculum/chapter/${item.module_id}?subject_id=${encodeURIComponent(subjectId)}&class_id=${encodeURIComponent(class_id)}&classroom_id=${encodeURIComponent(classroom_id)}&module_name=${encodeURIComponent(item.module_name || '')}&class_name=${encodeURIComponent(headerClassName || '')}&section_name=${encodeURIComponent(headerSectionName || '')}`)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-[#f86730]/10 text-[#f86730] rounded-lg flex items-center justify-center text-sm font-semibold group-hover:bg-[#f86730]/20 transition-colors">
                          {index + 1}
                        </div>
                        <h3 className="text-lg font-semibold text-[#0F172A] group-hover:text-[#f86730] transition-colors">
                          {item.module_name}
                        </h3>
                        <div className="ml-2 flex items-center gap-1">
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-[#f86730] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      {item.module_description && (
                        <p className="text-sm text-gray-600 ml-11">{item.module_description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right min-w-[100px]">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-100 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-2 bg-[#f86730] rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(0, Math.min(100, Number(item.progress_percentage) || 0))}%` }} 
                            />
                          </div>
                          <span className="text-sm font-bold text-gray-900 min-w-[40px]">
                            {Math.max(0, Math.min(100, Number(item.progress_percentage) || 0))}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">Completion</div>
                      </div>
                      
                      <div className="w-8 h-8 bg-gray-100 group-hover:bg-[#f86730]/10 rounded-full flex items-center justify-center transition-colors">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-[#f86730] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
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