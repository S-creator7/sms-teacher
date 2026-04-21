import { FaPaperclip, FaPaperPlane, FaSearch, FaArchive, FaInfoCircle, FaEdit, FaTrash, FaShare, FaCheck, FaCheckDouble, FaEllipsisV, FaTimes } from "react-icons/fa";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString();
}

export default function ConversationSidebar({
  conversations,
  unread,
  loadingConversations,
  conversationStatus,
  searchChat,
  unreadSubscription,
  selectedConversation,
  onSelect,
  onNewChat,
  onSearch,
  onStatusChange,
  onArchive,
  onUnarchive,
}) {
  return (
    <div
      className={`${conversations.length > 0 ? "hidden lg:flex" : "flex"
        } w-full lg:w-[25%] border-r border-gray-200 flex flex-col bg-white min-h-0`}
    >
      <div className="bg-[#f7f9fc] px-5 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-xs">
            T
          </div>
          <div className="font-semibold text-base text-gray-800">Chats</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-orange-400 text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-2">
            <span>Unread: {unread}</span>
            {unreadSubscription?.subscribed && (
              <span className="w-2 h-2 bg-white rounded-full"></span>
            )}
          </div>
          <button
            onClick={onNewChat}
            className="w-9 h-9 bg-blue-400 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <FaEdit size={18} />
          </button>
        </div>
      </div>

      <div className="bg-[#f7f9fc] px-4 py-2 border-b border-gray-200">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            value={searchChat}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white text-xs pl-12 pr-4 py-2.5 rounded-2xl outline-none border border-gray-200 focus:border-blue-400"
          />
        </div>
        <div className="flex mt-2.5 space-x-2">
          {[
            { key: "active", label: "Active" },
            { key: "archived", label: "Archived" },
            { key: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onStatusChange(tab.key)}
              className={`flex-1 px-3.5 py-1.5 text-xs rounded-xl transition-colors ${conversationStatus === tab.key
                ? "bg-blue-400 text-white shadow-sm"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white min-h-0">
        {loadingConversations && (
          <div className="p-3 text-center text-gray-500 text-xs">Loading conversations...</div>
        )}
        {!loadingConversations && conversations.length === 0 && (
          <div className="p-3 text-center text-gray-500 text-xs">No conversations found</div>
        )}
        {!loadingConversations &&
          conversations.map((conv) => {
            const isSelected = selectedConversation?.conversation_id === conv.conversation_id;
            const isArchived = conversationStatus === "archived" ? true : !!conv.is_archived;

            return (
              <div
                key={conv.conversation_id}
                onClick={() => onSelect(conv)}
                className={`px-5 py-3.5 flex items-center gap-3 cursor-pointer border-b border-gray-100 transition-colors ${isSelected ? "bg-blue-50 border-l-4 border-l-blue-300" : "hover:bg-gray-50"
                  }`}
              >
                <div className="w-9 h-9 rounded-full bg-orange-300 flex items-center justify-center text-xs font-semibold text-white">
                  {`${conv.parent_first_name || ""} ${conv.parent_last_name || ""}`.trim()[0]?.toUpperCase() ||
                    "P"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="font-medium text-gray-900">
                      {`${conv.parent_first_name || ""} ${conv.parent_last_name || ""}`.trim()}
                    </div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">
                      {formatTime(conv.last_message_at || conv.created_at)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-600 truncate">
                      {`${conv.student_first_name || ""} ${conv.student_last_name || ""}`.trim()}
                      {conv.subject_name ? ` • ${conv.subject_name}` : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      {conv.unread_count > 0 && (
                        <span className="min-w-[22px] h-5 text-center rounded-full bg-orange-400 text-white text-[10px] flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                      {conversationStatus === "active" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchive(conv);
                          }}
                          className="text-[11px] px-2 py-1 rounded-full border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-500 bg-white transition-colors"
                        >
                          Archive
                        </button>
                      )}
                      {conversationStatus === "archived" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnarchive(conv);
                          }}
                          className="text-[11px] px-2 py-1 rounded-full border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-500 bg-white transition-colors"
                        >
                          Unarchive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}