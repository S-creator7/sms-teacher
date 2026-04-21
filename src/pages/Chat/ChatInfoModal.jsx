import { FaTimes } from "react-icons/fa";

export default function ChatInfoModal({ conversation, participants, onClose }) {
  if (!conversation || !participants) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <div className="font-bold text-xl text-gray-900">Chat Information</div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <FaTimes size={16} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="text-sm text-blue-700 font-medium mb-1">Parent</div>
            <div className="font-semibold text-gray-900">
              {participants.parent_first_name} {participants.parent_last_name}
            </div>
            {participants.parent_phone && (
              <div className="text-sm text-gray-600 mt-1">{participants.parent_phone}</div>
            )}
            {participants.parent_email && (
              <div className="text-sm text-gray-600">{participants.parent_email}</div>
            )}
          </div>
          <div className="bg-orange-50 p-4 rounded-xl">
            <div className="text-sm text-orange-700 font-medium mb-1">Teacher</div>
            <div className="font-semibold text-gray-900">
              {participants.teacher_first_name} {participants.teacher_last_name}
            </div>
            {participants.employee_number && (
              <div className="text-sm text-gray-600 mt-1">ID: {participants.employee_number}</div>
            )}
            {participants.teacher_phone && (
              <div className="text-sm text-gray-600">{participants.teacher_phone}</div>
            )}
            {participants.teacher_email && (
              <div className="text-sm text-gray-600">{participants.teacher_email}</div>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="text-sm text-gray-700 font-medium mb-1">Student</div>
            <div className="font-semibold text-gray-900">
              {participants.student_first_name} {participants.student_last_name}
            </div>
          </div>
          {participants.subject_name && (
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="text-sm text-blue-700 font-medium mb-1">Subject</div>
              <div className="font-semibold text-gray-900">{participants.subject_name}</div>
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-gray-600 pt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  participants.parent_online ? "bg-green-500" : "bg-gray-400"
                }`}></span>
                Parent Online
              </span>
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  participants.teacher_online ? "bg-green-500" : "bg-gray-400"
                }`}></span>
                Teacher Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}