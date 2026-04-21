import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL;

export const useChatSocket = (token, onNewMessage, onStatusChange, onTyping) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Initialize socket
    const socket = io(SOCKET_URL, {
      auth: { token: `Bearer ${token}` },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ [Socket] Connected:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ [Socket] Disconnected:", reason);
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("💥 [Socket] Connection Error:", err.message);
    });

    // Handle new messages
    socket.on("new_message", (message) => {
      console.log("📩 [Socket] New Message:", message);
      if (onNewMessage) onNewMessage(message);
    });

    socket.on("new_conversation", (data) => {
      console.log("🆕 [Socket] New Conversation:", data);
      if (onNewMessage) onNewMessage({ type: 'NEW_CONVERSATION', ...data });
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      if (onTyping) onTyping({ ...data, isTyping: true });
    });

    socket.on("typing_stop", (data) => {
      if (onTyping) onTyping({ ...data, isTyping: false });
    });

    // Handle status changes (online/offline)
    socket.on("user_status_change", (data) => {
      if (onStatusChange) onStatusChange(data);
    });

    // Handle messages read notification
    socket.on("messages_read", (data) => {
      console.log("👁️ [Socket] Messages read:", data);
      // You could update UI state here if needed
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token]);

  const joinConversation = useCallback((conversationId) => {
    if (socketRef.current && conversationId) {
      console.log("🚪 [Socket] Joining Conversation:", conversationId);
      socketRef.current.emit("join_conversation", conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    if (socketRef.current && conversationId) {
      console.log("🚪 [Socket] Leaving Conversation:", conversationId);
      socketRef.current.emit("leave_conversation", conversationId);
    }
  }, []);

  const sendTyping = useCallback((conversationId, isStarting) => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit(isStarting ? "typing_start" : "typing_stop", {
        conversationId,
      });
    }
  }, []);

  const markRead = useCallback((conversationId) => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit("mark_messages_read", { conversationId });
    }
  }, []);

  return {
    connected,
    joinConversation,
    leaveConversation,
    sendTyping,
    markRead,
    socket: socketRef.current,
  };
};
