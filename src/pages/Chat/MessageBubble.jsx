import { FaEllipsisV, FaShare, FaTrash, FaCheck, FaCheckDouble } from "react-icons/fa";
import { useState } from "react";

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

export default function MessageBubble({ 
  message, 
  onForward, 
  onShowMessageMenu, 
  onDeleteMessage,
  showMessageMenu 
}) {
  const [open, setOpen] = useState(false);
  const isMe = message.sender_type === "teacher";
  const isRead = !!message.is_read;
  const showMenu = showMessageMenu === message.message_id;

  return (
    <div className={`flex items-start mb-3 group ${isMe ? "justify-end" : "justify-start"}`}>
      <div className="relative flex items-start">
        {!isMe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowMessageMenu(showMenu ? null : message.message_id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center ml-1 mr-1"
          >
            <FaEllipsisV size={10} className="text-gray-600" />
          </button>
        )}
        
        <div className={`relative px-3 py-2.5 rounded-2xl shadow-sm max-w-xs lg:max-w-md ${
          isMe
            ? "bg-blue-500/90 text-white rounded-br-md"
            : "bg-white text-gray-900 rounded-bl-md border border-gray-200"
        }`}>
          {message.message_type === "document" && message.file_url ? (
            <a
              href={message.file_url}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-2 font-medium ${
                isMe ? "text-blue-100" : "text-blue-600"
              } hover:underline`}
            >
              <FaShare size={14} />
              {message.file_name || message.message_text}
            </a>
          ) : (
            <div className="whitespace-pre-wrap break-words text-[13px] leading-snug">
              {message.message_text}
            </div>
          )}

          <div className="flex items-center justify-end gap-1.5 mt-1.5">
            <span className={`text-[10px] ${isMe ? "text-blue-200" : "text-gray-500"}`}>
              {formatTime(message.created_at)}
            </span>
            {isMe && (
              <span className={isRead ? "text-blue-200" : "text-blue-200"}>
                {isRead ? <FaCheckDouble size={10} /> : <FaCheck size={10} />}
              </span>
            )}
          </div>

          <div className="relative">
            {isMe && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowMessageMenu(showMenu ? null : message.message_id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center ml-1"
              >
                <FaEllipsisV size={10} className="text-white" />
              </button>
            )}
          </div>
        </div>

        {showMenu && (
          <div
            className={`absolute ${isMe ? 'right-8' : 'left-8'} -top-8 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[120px] overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onForward(message.message_id);
                onShowMessageMenu(null);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <FaShare size={12} />
              Forward
            </button>
            <button
              onClick={() => {
                onDeleteMessage(message.message_id);
                onShowMessageMenu(null);
              }}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
            >
              <FaTrash size={12} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}