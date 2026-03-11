import MessageList from "./MessageList";
import Composer from "./Composer";
import { FaSearch, FaInfoCircle, FaTimes } from "react-icons/fa";
import { searchMessages } from "../../Utility/chatApi";
import { useState, useEffect } from "react";

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

export default function ChatWindow({ 
  conversation, 
  messages, 
  loadingMessages,
  sending,
  fileUploading,
  showMessageMenu,
  onSearch, 
  onClearSearch, 
  onInfo, 
  onForward,
  onSendMessage,
  onFileUpload,
  onShowMessageMenu,
  onDeleteMessage
}) {
  const [q, setQ] = useState("");
  const [searchInConversation, setSearchInConversation] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  async function handleSearch(v) {
    setQ(v);
    setSearchInConversation(v);
    if (!v) {
      onClearSearch();
      setShowMobileSearch(false);
    }
    try {
      const res = await searchMessages(conversation.conversation_id, { query: v });
      onSearch(res?.resources?.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  if (!conversation)
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-400 mb-1">AAPLISHALA</div>
          <div className="text-gray-500 text-xs">Select a conversation to start messaging</div>
        </div>
      </div>
    );

  return (
    <div className={`${
      conversation ? "flex" : "hidden lg:flex"
    } flex-1 flex-col bg-slate-900 min-h-0`}>
      <div className="bg-[#f0f2f5] px-4 py-2 border-b border-gray-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">
            {`${conversation.parent_first_name || ""} ${
              conversation.parent_last_name || ""
            }`.trim()[0]?.toUpperCase() || "P"}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">
              {`${conversation.parent_first_name || ""} ${
                conversation.parent_last_name || ""
              }`.trim()}
            </div>
            <div className="text-xs text-gray-600">
              {`${conversation.student_first_name || ""} ${
                conversation.student_last_name || ""
              }`.trim()}
              {conversation.subject_name
                ? ` • ${conversation.subject_name}`
                : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative lg:flex hidden">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
            <input
              value={searchInConversation}
              onChange={(e) => handleSearch(e.target.value)}
              className="bg-white text-xs pl-10 pr-3 py-2 rounded-2xl outline-none border border-gray-300 focus:border-blue-500 w-56"
              placeholder="Search in chat..."
            />
          </div>
          <button
            type="button"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="lg:hidden w-9 h-9 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
          >
            {showMobileSearch ? <FaTimes size={14} /> : <FaSearch size={14} />}
          </button>
          <button
            type="button"
            onClick={onInfo}
            className="w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <FaInfoCircle size={18} />
          </button>
        </div>
      </div>

      {showMobileSearch && (
        <div className="lg:hidden absolute top-0 left-0 right-0 bg-white border-b border-gray-300 p-4 z-50">
          <div className="flex items-center gap-2 mb-3">
            <FaSearch className="text-gray-500" size={16} />
            <input
              value={searchInConversation}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 bg-gray-50 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none border border-gray-300 focus:border-blue-500"
              placeholder="Search in chat..."
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
            >
              <FaTimes size={14} />
            </button>
          </div>
        </div>
      )}

      <MessageList 
        messages={messages} 
        loadingMessages={loadingMessages}
        showMessageMenu={showMessageMenu}
        onForward={onForward}
        onShowMessageMenu={onShowMessageMenu}
        onDeleteMessage={onDeleteMessage}
      />
      <Composer 
        conversation={conversation}
        sending={sending}
        fileUploading={fileUploading}
        onSendMessage={onSendMessage}
        onFileUpload={onFileUpload}
      />
    </div>
  );
}