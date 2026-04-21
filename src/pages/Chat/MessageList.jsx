import MessageBubble from "./MessageBubble";
import { useEffect, useRef, useMemo } from "react";

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString();
}

export default function MessageList({ messages, loadingMessages, showMessageMenu, onForward, onShowMessageMenu, onDeleteMessage, onImageClick }) {
  const endRef = useRef(null);
  const containerRef = useRef(null);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate = null;
    messages.forEach((m) => {
      const date = formatDate(m.created_at);
      if (!lastDate || lastDate !== date) {
        groups.push({ type: "date", id: date, label: date });
        lastDate = date;
      }
      groups.push({ type: "message", data: m, id: m.message_id });
    });
    return groups;
  }, [messages]);

  useEffect(() => {
    console.log('MessageList useEffect triggered, messages length:', messages.length);
    if (messages.length > 0) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        console.log('Attempting to scroll to bottom');
        // Try multiple scroll methods
        if (endRef.current) {
          console.log('Using scrollIntoView');
          endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
        // Also try scrolling the container directly
        if (containerRef.current) {
          console.log('Using scrollTop, container height:', containerRef.current.scrollHeight);
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-2 bg-[#e5ddd5] bg-opacity-70 min-h-0"
      onClick={() => onShowMessageMenu(null)}
    >
      {loadingMessages && (
        <div className="text-center text-gray-500 py-2 text-xs">Loading messages...</div>
      )}
      {!loadingMessages && groupedMessages.length === 0 && (
        <div className="text-center text-gray-500 py-2 text-xs">No messages yet. Start the conversation!</div>
      )}
      {!loadingMessages &&
        groupedMessages.map((item) => {
          if (item.type === "date") {
            return (
              <div className="flex justify-center my-4" key={item.id}>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-gray-300 text-gray-700 bg-opacity-80">
                  {item.label}
                </span>
              </div>
            );
          }
          const m = item.data;
          return (
            <MessageBubble
              key={m.message_id}
              message={m}
              onForward={onForward}
              onShowMessageMenu={onShowMessageMenu}
              onDeleteMessage={onDeleteMessage}
              showMessageMenu={showMessageMenu}
              onImageClick={onImageClick}
            />
          );
        })}
      <div ref={endRef} />
    </div>
  );
}