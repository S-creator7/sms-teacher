import { FaEllipsisV, FaShare, FaTrash, FaCheck, FaCheckDouble, FaFileAlt, FaDownload } from "react-icons/fa";
import { useState } from "react";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isImage(fileName) {
  if (!fileName) return false;
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext);
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function MessageBubble({ 
  message, 
  onForward, 
  onShowMessageMenu, 
  onDeleteMessage,
  showMessageMenu,
  onImageClick
}) {
  const isMe = message.sender_type === "teacher";
  const isRead = !!message.is_read;
  const showMenu = showMessageMenu === message.message_id;
  const isMsgImage = message.message_type === "image" || (message.message_type === "document" && isImage(message.file_name));
  const isMsgDoc = message.message_type === "document" && !isImage(message.file_name);

  return (
    <div className={`flex items-start mb-4 group ${isMe ? "justify-end" : "justify-start"}`}>
      <div className="relative flex items-start max-w-[85%] lg:max-w-[70%]">
        {!isMe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowMessageMenu(showMenu ? null : message.message_id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-1 mt-1 shadow-sm"
          >
            <FaEllipsisV size={10} className="text-gray-500" />
          </button>
        )}
        
        <div className={`relative rounded-2xl shadow-sm overflow-hidden ${
          isMe
            ? "bg-blue-600 text-white rounded-tr-none"
            : "bg-white text-gray-900 rounded-tl-none border border-gray-100"
        } ${isMsgImage ? "p-1" : "px-3 py-2"}`}>
          
          {/* Image Content */}
          {isMsgImage ? (
            <div className="relative group/img cursor-pointer" onClick={() => onImageClick?.(message.file_url)}>
              <img 
                src={message.file_url} 
                alt={message.file_name}
                className="max-w-full h-auto rounded-lg object-cover min-w-[120px] sm:min-w-[180px] max-h-[240px] sm:max-h-[320px] transition-transform duration-200 group-hover/img:scale-[1.01]"
                loading="lazy"
              />
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-lg">
                <span className="text-[9px] text-white/90">
                  {formatTime(message.created_at)}
                </span>
                {isMe && (
                  <span className="text-white/90">
                    {isRead ? <FaCheckDouble size={9} /> : <FaCheck size={9} />}
                  </span>
                )}
              </div>
            </div>
          ) : isMsgDoc ? (
            /* Document Content */
            <div className="flex flex-col gap-1.5 min-w-[140px] sm:min-w-[180px]">
              <div className={`flex items-center gap-2 p-2 rounded-xl ${isMe ? "bg-blue-700/40" : "bg-gray-100/80 border border-gray-200/50"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMe ? "bg-blue-400/20" : "bg-blue-500"}`}>
                  <FaFileAlt size={16} className={isMe ? "text-blue-100" : "text-white"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[12px] font-medium truncate ${isMe ? "text-white" : "text-gray-900"}`}>
                    {message.file_name || "Document"}
                  </div>
                  <div className={`text-[9px] ${isMe ? "text-blue-100/80" : "text-gray-500"}`}>
                    {message.file_size ? formatFileSize(message.file_size) : "Document"}
                  </div>
                </div>
                <a 
                  href={message.file_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    isMe ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                  }`}
                >
                  <FaDownload size={12} />
                </a>
              </div>
              <div className="flex items-center justify-end gap-1 px-0.5">
                <span className={`text-[9px] ${isMe ? "text-blue-100/80" : "text-gray-500"}`}>
                  {formatTime(message.created_at)}
                </span>
                {isMe && (
                  <span className={isRead ? "text-blue-200" : "text-blue-100/80"}>
                    {isRead ? <FaCheckDouble size={9} /> : <FaCheck size={9} />}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Text Content */
            <>
              <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed mb-1">
                {message.message_text}
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span className={`text-[10px] ${isMe ? "text-blue-100" : "text-gray-500"}`}>
                  {formatTime(message.created_at)}
                </span>
                {isMe && (
                  <span className={isRead ? "text-blue-200" : "text-blue-100"}>
                    {isRead ? <FaCheckDouble size={10} /> : <FaCheck size={10} />}
                  </span>
                )}
              </div>
            </>
          )}

          {isMe && (
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowMessageMenu(showMenu ? null : message.message_id);
                }}
                className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                  isMe ? "bg-blue-700 hover:bg-blue-800 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-500"
                }`}
              >
                <FaEllipsisV size={10} />
              </button>
            </div>
          )}
        </div>

        {showMenu && (
          <div
            className={`absolute ${isMe ? 'right-0' : 'left-0'} top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 min-w-[140px] overflow-hidden py-1`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onForward(message.message_id);
                onShowMessageMenu(null);
              }}
              className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <FaShare size={12} className="text-gray-400" />
              Forward
            </button>
            <button
              onClick={() => {
                onDeleteMessage(message.message_id);
                onShowMessageMenu(null);
              }}
              className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors border-t border-gray-50"
            >
              <FaTrash size={12} className="text-red-400" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}