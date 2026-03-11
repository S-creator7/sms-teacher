import { useState } from "react";
import { FaPaperPlane, FaPaperclip } from "react-icons/fa";

export default function Composer({ conversation, sending, fileUploading, onSendMessage, onFileUpload }) {
  const [text, setText] = useState("");

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    try {
      await onSendMessage({
        messageText: text.trim(),
        messageType: "text",
      });
      setText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !conversation || fileUploading) return;
    try {
      await onFileUpload(file);
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <form onSubmit={send} className="bg-[#f0f2f5]/80 px-4 py-3 flex items-center gap-3">
      <label className="cursor-pointer w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-blue-500 hover:border-blue-500 transition-colors">
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={fileUploading || !conversation}
        />
        {fileUploading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        ) : (
          <FaPaperclip size={18} />
        )}
      </label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 bg-white text-xs px-4 py-2.5 rounded-2xl outline-none border border-gray-300 focus:border-blue-500"
        disabled={sending || fileUploading}
      />

      <button
        type="submit"
        disabled={!text.trim() || sending || fileUploading || !conversation}
        className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          <FaPaperPlane size={16} />
        )}
      </button>
    </form>
  );
}