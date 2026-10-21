import { FaPaperclip, FaPaperPlane, FaSearch, FaArchive, FaInfoCircle, FaEdit, FaTrash, FaShare, FaCheck, FaCheckDouble, FaEllipsisV, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  return (
    <div
      className={`${
        conversations.length > 0 ? "hidden lg:flex" : "flex"
      } w-full lg:w-[25%] border-r border-gray-200 flex flex-col bg-white min-h-0`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f86730] flex items-center justify-center text-white font-semibold text-xs">
            T
          </div>
          <div className="font-semibold text-sm text-gray-800">Chats</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[#f86730]/10 text-[#f86730] px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-2">
            <span>Unread: {unread}</span>
            {unreadSubscription?.subscribed && (
              <span className="w-1.5 h-1.5 bg-[#f86730] rounded-full animate-pulse"></span>
            )}
          </div>
          <button
            onClick={onNewChat}
            className="w-8 h-8 bg-[#f86730] hover:bg-[#e55a29] text-white rounded-lg flex items-center justify-center transition-colors"
          >
            <FaEdit size={14} />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          <input
            value={searchChat}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-gray-50 text-sm pl-9 pr-3 py-1.5 rounded-lg outline-none border border-gray-200 focus:border-[#f86730] focus:ring-2 focus:ring-[#f86730]/20 transition"
          />
        </div>
        <div className="flex mt-2 gap-1.5">
          {[
            { key: "active", label: "Active" },
            { key: "archived", label: "Archived" },
            { key: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onStatusChange(tab.key)}
              className={`flex-1 px-3 py-1 text-xs rounded-lg transition-colors ${
                conversationStatus === tab.key
                  ? "bg-[#f86730] text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto bg-white min-h-0">
        {loadingConversations && (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#f86730] border-t-transparent"></div>
            <p className="mt-2 text-xs text-gray-500">Loading conversations...</p>
          </div>
        )}
        {!loadingConversations && conversations.length === 0 && (
          <div className="p-6 text-center">
            <div className="text-gray-300 text-3xl mb-2">💬</div>
            <p className="text-xs text-gray-500">No conversations found</p>
          </div>
        )}
        {!loadingConversations &&
          conversations.map((conv) => {
            const isSelected = selectedConversation?.conversation_id === conv.conversation_id;
            const isArchived = conversationStatus === "archived" ? true : !!conv.is_archived;

            return (
              <div
                key={conv.conversation_id}
                onClick={() => onSelect(conv)}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer border-b border-gray-50 transition-colors ${
                  isSelected 
                    ? "bg-[#f86730]/5 border-l-4 border-l-[#f86730]" 
                    : "hover:bg-gray-50/80"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#f86730]/10 flex items-center justify-center text-xs font-semibold text-[#f86730]">
                  {`${conv.parent_first_name || ""} ${conv.parent_last_name || ""}`.trim()[0]?.toUpperCase() ||
                    "P"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="font-medium text-sm text-gray-800 truncate">
                      {`${conv.parent_first_name || ""} ${conv.parent_last_name || ""}`.trim()}
                    </div>
                    <div className="text-[10px] text-gray-400 whitespace-nowrap">
                      {formatTime(conv.last_message_at || conv.created_at)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500 truncate">
                      {`${conv.student_first_name || ""} ${conv.student_last_name || ""}`.trim()}
                      {conv.subject_name ? ` • ${conv.subject_name}` : ""}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {conv.unread_count > 0 && (
                        <span className="min-w-[20px] h-5 text-center rounded-full bg-[#f86730] text-white text-[10px] font-medium flex items-center justify-center px-1.5">
                          {conv.unread_count}
                        </span>
                      )}
                      {conversationStatus === "active" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchive(conv);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg border border-gray-200 text-gray-500 hover:border-[#f86730] hover:text-[#f86730] hover:bg-[#f86730]/5 transition"
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
                          className="text-[10px] px-2 py-0.5 rounded-lg border border-gray-200 text-gray-500 hover:border-[#f86730] hover:text-[#f86730] hover:bg-[#f86730]/5 transition"
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