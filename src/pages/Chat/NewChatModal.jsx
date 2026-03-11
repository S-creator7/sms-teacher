import { FaSearch, FaTimes } from "react-icons/fa";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="font-bold text-xl text-gray-900">New Conversation</div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <FaTimes size={16} />
          </button>
        </div>

        <div className="mb-6">
          <div className="font-semibold text-gray-700 mb-3">Search Parents</div>
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
            <input
              value={parentSearch}
              onChange={(e) => onParentSearch(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full bg-gray-50 text-sm pl-12 pr-4 py-3 rounded-xl outline-none border border-gray-300 focus:border-blue-500"
            />
          </div>
          {searchingParents && (
            <div className="text-sm text-gray-500 mt-3 text-center">Searching...</div>
          )}
          <div className="space-y-3 mt-3">
            {parentResults.map((p) => (
              <div
                key={p.parent_id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                    {p.first_name?.[0]}{p.last_name?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {p.phone_number} {p.email ? `• ${p.email}` : ""}
                    </div>
                  </div>
                </div>
                <button
                  disabled={startingConversation}
                  onClick={() => onStartConversation(p, p.student_id)}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 transition-colors"
                >
                  {startingConversation ? "Starting..." : "Start Chat"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="font-semibold text-gray-700 mb-4">Select from Class</div>
          {loadingClassParents && (
            <div className="text-sm text-gray-500 text-center py-4">Loading classes...</div>
          )}
          {!loadingClassParents && classParents.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={selectedClassKey}
                  onChange={(e) => {
                    onSelectClassKey(e.target.value);
                  }}
                  className="bg-gray-50 border border-gray-300 text-sm px-4 py-3 rounded-xl focus:border-blue-500 outline-none"
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
                  onChange={(e) => {
                    onSelectSubjectId(e.target.value);
                  }}
                  disabled={!selectedClassKey}
                  className="bg-gray-50 border border-gray-300 text-sm px-4 py-3 rounded-xl focus:border-blue-500 outline-none disabled:opacity-50"
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
                  className="bg-gray-50 border border-gray-300 text-sm px-4 py-3 rounded-xl focus:border-blue-500 outline-none disabled:opacity-50"
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
                <div className="space-y-3 max-h-48 overflow-y-auto">
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
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                            {p.parent_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {p.parent_name}
                              {p.relationship ? ` (${p.relationship})` : ""}
                            </div>
                            <div className="text-sm text-gray-600">
                              {p.phone} {p.email ? `• ${p.email}` : ""}
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
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 transition-colors"
                        >
                          {startingConversation ? "Starting..." : "Chat"}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}