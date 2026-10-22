import { FaSearch, FaTimes, FaUser, FaPhone, FaEnvelope, FaComment, FaGraduationCap } from "react-icons/fa";
import { Loader } from "lucide-react";

// Shared style tokens
const inputClass =
  "w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#f86730]/50 focus:border-[#f86730] transition-all duration-200";
const selectClass =
  "w-full bg-[#F8FAFC] border border-[#E2E8F0] text-sm px-4 py-2.5 rounded-xl text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#f86730]/50 focus:border-[#f86730] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200";

export default function NewChatModal({
  onClose,
  onCreated,
  parentSearch,
  parentResults,
  searchingParents,
  classParents,
  loadingClassParents,
  selectedClassKey,
  selectedSubjectId,
  selectedStudentId,
  startingConversation,
  onParentSearch,
  onSelectClassKey,
  onSelectSubjectId,
  onSelectStudentId,
  onStartConversation
}) {
  return (
    <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/25 w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-[#E2E8F0] animate-slideUp">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] rounded-t-2xl sticky top-0 z-10">
          <h2 className="font-bold text-lg text-[#0F172A] flex items-center gap-2">
            <FaComment className="text-[#f86730]" />
            New Conversation
          </h2>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A] transition-colors hover:bg-white rounded-lg w-8 h-8 flex items-center justify-center"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Search Parents */}
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-3">
              <FaSearch className="text-[#f86730] text-xs" />
              Search Parents
            </h3>
            <div className="relative">
              <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#94A3B8] text-sm" />
              <input
                value={parentSearch}
                onChange={(e) => onParentSearch(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className={inputClass}
              />
            </div>

            {searchingParents && (
              <div className="flex items-center justify-center gap-2 text-sm text-[#64748B] mt-3">
                <Loader className="h-4 w-4 animate-spin text-[#f86730]" />
                Searching...
              </div>
            )}

            {parentResults.length > 0 && (
              <div className="space-y-2 mt-3 max-h-64 overflow-y-auto">
                {parentResults.map((p) => (
                  <div
                    key={p.parent_id}
                    className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-xl hover:bg-orange-50/50 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f86730] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-[#0F172A] truncate">
                          {p.first_name} {p.last_name}
                        </div>
                        <div className="text-xs text-[#64748B] flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <FaPhone className="text-[10px]" />
                            {p.phone_number}
                          </span>
                          {p.email && (
                            <span className="flex items-center gap-1">
                              <FaEnvelope className="text-[10px]" />
                              {p.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={startingConversation}
                      onClick={() => onStartConversation(p, p.student_id)}
                      className="px-4 py-1.5 bg-[#f86730] text-white text-xs font-medium rounded-lg hover:bg-[#e35d1f] active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                    >
                      {startingConversation ? (
                        <>
                          <Loader className="h-3 w-3 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <FaComment className="text-[10px]" />
                          Start Chat
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Select from Class */}
          <div className="border-t border-[#E2E8F0] pt-5">
            <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2 mb-4">
              <FaGraduationCap className="text-[#f86730] text-xs" />
              Select from Class
            </h3>

            {loadingClassParents && (
              <div className="flex items-center justify-center gap-2 text-sm text-[#64748B] py-4">
                <Loader className="h-4 w-4 animate-spin text-[#f86730]" />
                Loading classes...
              </div>
            )}

            {!loadingClassParents && classParents.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={selectedClassKey}
                    onChange={(e) => onSelectClassKey(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select Class</option>
                    {classParents.map((cls) => {
                      const key = `${cls.class_id}-${cls.section_id}-${cls.subject_id}`;
                      return (
                        <option key={key} value={key}>
                          {cls.class_name}
                          {cls.section_name ? ` • ${cls.section_name}` : ""}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    value={selectedSubjectId}
                    onChange={(e) => onSelectSubjectId(e.target.value)}
                    disabled={!selectedClassKey}
                    className={selectClass}
                  >
                    <option value="">Select Subject</option>
                    {classParents
                      .filter((cls) => {
                        const key = `${cls.class_id}-${cls.section_id}-${cls.subject_id}`;
                        return key === selectedClassKey;
                      })
                      .map((cls) => (
                        <option key={cls.subject_id} value={cls.subject_id}>
                          {cls.subject_name}
                        </option>
                      ))}
                  </select>

                  <select
                    value={selectedStudentId}
                    onChange={(e) => onSelectStudentId(e.target.value)}
                    disabled={!selectedClassKey || !selectedSubjectId}
                    className={selectClass}
                  >
                    <option value="">Select Student</option>
                    {classParents
                      .filter((cls) => {
                        const key = `${cls.class_id}-${cls.section_id}-${cls.subject_id}`;
                        return (
                          key === selectedClassKey &&
                          String(cls.subject_id) === String(selectedSubjectId)
                        );
                      })
                      .flatMap((cls) => cls.students || [])
                      .map((stu) => (
                        <option key={stu.student_id} value={stu.student_id}>
                          {stu.student_name}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedStudentId && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {classParents
                      .filter((cls) => {
                        const key = `${cls.class_id}-${cls.section_id}-${cls.subject_id}`;
                        return (
                          key === selectedClassKey &&
                          String(cls.subject_id) === String(selectedSubjectId)
                        );
                      })
                      .flatMap((cls) => cls.students || [])
                      .filter(
                        (stu) => String(stu.student_id) === String(selectedStudentId)
                      )
                      .flatMap((stu) => stu.parents || [])
                      .map((p) => (
                        <div
                          key={p.parent_id}
                          className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] hover:border-[#f86730]/40 transition-colors duration-150"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {p.parent_name?.[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-[#0F172A] truncate">
                                {p.parent_name}
                                {p.relationship ? ` (${p.relationship})` : ""}
                              </div>
                              <div className="text-xs text-[#64748B] flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <FaPhone className="text-[10px]" />
                                  {p.phone}
                                </span>
                                {p.email && (
                                  <span className="flex items-center gap-1">
                                    <FaEnvelope className="text-[10px]" />
                                    {p.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            disabled={startingConversation}
                            onClick={() =>
                              onStartConversation(
                                { parent_id: p.parent_id },
                                Number(selectedStudentId)
                              )
                            }
                            className="px-4 py-1.5 bg-[#f86730] text-white text-xs font-medium rounded-lg hover:bg-[#e35d1f] active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                          >
                            {startingConversation ? (
                              <>
                                <Loader className="h-3 w-3 animate-spin" />
                                Starting...
                              </>
                            ) : (
                              <>
                                <FaComment className="text-[10px]" />
                                Chat
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {!loadingClassParents && classParents.length === 0 && (
              <div className="text-center py-6 text-sm text-[#64748B]">
                No classes available
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}