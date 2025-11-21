import { useEffect, useMemo, useState } from "react";
import { 
  FaPaperclip, 
  FaPaperPlane, 
  FaSearch, 
  FaArchive, 
  FaInfoCircle, 
  FaEdit,
  FaTrash,
  FaShare,
  FaCheck,
  FaCheckDouble,
  FaEllipsisV,
  FaTimes
} from "react-icons/fa";
import {
  getConversations,
  getMessages,
  sendMessage,
  uploadChatFile,
  markConversationRead,
  getUnreadCount,
  subscribeUnreadCount,
  archiveConversation,
  unarchiveConversation,
  searchMessages as searchMessagesApi,
  getConversationParticipants,
  getClassStudentParents,
  searchParents,
  startConversation,
  softDeleteMessage,
  forwardMessage,
} from "../Utility/chatApi";

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

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchChat, setSearchChat] = useState("");
  const [searchInConversation, setSearchInConversation] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationStatus, setConversationStatus] = useState("active");
  const [fileUploading, setFileUploading] = useState(false);
  const [participants, setParticipants] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [parentSearch, setParentSearch] = useState("");
  const [parentResults, setParentResults] = useState([]);
  const [startingConversation, setStartingConversation] = useState(false);
  const [searchingParents, setSearchingParents] = useState(false);
  const [unreadSubscription, setUnreadSubscription] = useState(null);
  const [classParents, setClassParents] = useState([]);
  const [loadingClassParents, setLoadingClassParents] = useState(false);
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);

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

  async function loadUnreadCount() {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res?.resources?.unread_count || 0);
    } catch {}
  }

  async function loadUnreadSubscription() {
    try {
      const res = await subscribeUnreadCount();
      setUnreadSubscription(res?.resources?.subscription || null);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadClassParents() {
    try {
      setLoadingClassParents(true);
      const res = await getClassStudentParents();
      const data = res?.resources?.data;
      setClassParents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClassParents(false);
    }
  }

  async function loadConversations(extra = {}) {
    try {
      setLoadingConversations(true);
      const res = await getConversations({
        page: 1,
        limit: 50,
        search: searchChat || undefined,
        status: conversationStatus,
        ...extra,
      });
      const data = res?.resources?.data;
      setConversations(data?.conversations || []);
      setPagination(data?.pagination || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId) {
    if (!conversationId) return;
    try {
      setLoadingMessages(true);
      const res = await getMessages(conversationId, {
        page: 1,
        limit: 50,
      });
      setMessages(res?.resources?.data || []);
      await markConversationRead(conversationId);
      await loadUnreadCount();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, [conversationStatus]);

  useEffect(() => {
    loadUnreadSubscription();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadConversations();
    }, 400);
    return () => clearTimeout(t);
  }, [searchChat]);

  useEffect(() => {
    if (!selectedConversation || !searchInConversation) return;
    const t = setTimeout(async () => {
      try {
        const res = await searchMessagesApi(selectedConversation.conversation_id, {
          query: searchInConversation,
          page: 1,
          limit: 50,
        });
        const searched = res?.resources?.data || res?.resources?.messages || [];
        setMessages(searched);
      } catch (e) {
        console.error(e);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchInConversation, selectedConversation]);

  useEffect(() => {
    if (!showNewChat || !parentSearch.trim()) return;
    const t = setTimeout(async () => {
      try {
        setSearchingParents(true);
        const res = await searchParents({
          search: parentSearch,
          page: 1,
          limit: 20,
        });
        const data = res?.resources?.data;
        setParentResults(data?.parents || []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingParents(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [parentSearch, showNewChat]);

  useEffect(() => {
    if (showNewChat && classParents.length === 0 && !loadingClassParents) {
      loadClassParents();
    }
  }, [showNewChat, classParents.length, loadingClassParents]);

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setSearchInConversation("");
    loadMessages(conv.conversation_id);
    setShowMessageMenu(null);
  };

  async function handleLoadParticipants() {
    if (!selectedConversation) return;
    try {
      const res = await getConversationParticipants(
        selectedConversation.conversation_id
      );
      setParticipants(res?.resources?.data || null);
      setShowInfo(true);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleStartConversationForParent(parent, studentId) {
    if (!parent?.parent_id || !studentId) return;
    try {
      setStartingConversation(true);
      const res = await startConversation({
        parentId: parent.parent_id,
        studentId,
      });
      const conv = res?.resources?.data || res?.resources?.conversation;
      await loadConversations();
      if (conv?.conversation_id) {
        const found =
          conversations.find(
            (c) => c.conversation_id === conv.conversation_id
          ) || conv;
        handleSelectConversation(found);
      }
      setShowNewChat(false);
      setParentSearch("");
      setParentResults([]);
      setSelectedClassKey("");
      setSelectedSubjectId("");
      setSelectedStudentId("");
    } catch (e) {
      console.error(e);
    } finally {
      setStartingConversation(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!selectedConversation || !messageText.trim()) return;
    try {
      setSending(true);
      const res = await sendMessage(selectedConversation.conversation_id, {
        messageText: messageText.trim(),
        messageType: "text",
      });
      const msg = res?.resources?.data;
      if (msg) {
        setMessages((prev) => [...prev, msg]);
      }
      setMessageText("");
      await loadConversations();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    try {
      setFileUploading(true);
      const uploadRes = await uploadChatFile(file);
      const fileInfo = uploadRes?.resources?.file;
      if (!fileInfo?.url) return;

      const res = await sendMessage(selectedConversation.conversation_id, {
        messageText: fileInfo.name || file.name,
        messageType: "document",
        fileUrl: fileInfo.url,
        fileName: fileInfo.name,
        fileSize: fileInfo.size,
      });
      const msg = res?.resources?.data;
      if (msg) {
        setMessages((prev) => [...prev, msg]);
      }
      await loadConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setFileUploading(false);
      e.target.value = "";
    }
  }

  async function handleArchive(conv) {
    try {
      await archiveConversation(conv.conversation_id);
      await loadConversations();

      if (
        selectedConversation?.conversation_id === conv.conversation_id &&
        conversationStatus === "active"
      ) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUnarchive(conv) {
    try {
      await unarchiveConversation(conv.conversation_id);
      await loadConversations();

      if (selectedConversation?.conversation_id === conv.conversation_id) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSoftDelete(messageId) {
    try {
      await softDeleteMessage(messageId);
      if (selectedConversation) {
        await loadMessages(selectedConversation.conversation_id);
      }
      setShowMessageMenu(null);
    } catch (e) {
      console.error(e);
    }
  }

  function openForwardModal(messageId) {
    setForwardMessageId(messageId);
    setShowForwardModal(true);
    setShowMessageMenu(null);
  }

  async function handleForward(targetConversationId) {
    try {
      if (!forwardMessageId || !targetConversationId) return;

      await forwardMessage(forwardMessageId, {
        targetConversationId,
      });

      if (selectedConversation) {
        await loadMessages(selectedConversation.conversation_id);
      }

      setShowForwardModal(false);
      setForwardMessageId(null);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="h-screen bg-[#f5f7fb] flex overflow-hidden">
      <div
        className={`${
          selectedConversation ? "hidden lg:flex" : "flex"
        } w-full lg:w-[35%] border-r border-gray-200 flex flex-col bg-white`}
      >
        <div className="bg-[#f7f9fc] px-5 py-2.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-base">
              T
            </div>
            <div className="font-semibold text-lg text-gray-800">Chats</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-orange-400 text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-2">
              <span>Unread: {unreadCount}</span>
              {unreadSubscription?.subscribed && (
                <span className="w-2 h-2 bg-white rounded-full"></span>
              )}
            </div>
            <button
              onClick={() => setShowNewChat(true)}
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
              onChange={(e) => setSearchChat(e.target.value)}
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
                onClick={() => setConversationStatus(tab.key)}
                className={`flex-1 px-3.5 py-1.5 text-xs rounded-xl transition-colors ${
                  conversationStatus === tab.key
                    ? "bg-blue-400 text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {loadingConversations && (
            <div className="p-3 text-center text-gray-500 text-xs">Loading conversations...</div>
          )}
          {!loadingConversations && conversations.length === 0 && (
            <div className="p-3 text-center text-gray-500 text-xs">No conversations found</div>
          )}
          {!loadingConversations &&
            conversations.map((conv) => {
              const isSelected = selectedConversation?.conversation_id === conv.conversation_id;
              // In the Archived tab, treat all as archived even if the flag is inconsistent
              const isArchived = conversationStatus === "archived" ? true : !!conv.is_archived;

              return (
                <div
                  key={conv.conversation_id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`px-5 py-3.5 flex items-center gap-3 cursor-pointer border-b border-gray-100 transition-colors ${
                    isSelected ? "bg-blue-50 border-l-4 border-l-blue-300" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-orange-300 flex items-center justify-center text-base font-semibold text-white">
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
                              handleArchive(conv);
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
                              handleUnarchive(conv);
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

      <div
        className={`${
          selectedConversation ? "flex" : "hidden lg:flex"
        } flex-1 flex-col bg-[#e5ddd5]`}
      >
        {!selectedConversation && (
          <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400 mb-2">AAPLISHALA</div>
              <div className="text-gray-500">Select a conversation to start messaging</div>
            </div>
          </div>
        )}
        {selectedConversation && (
          <>
            <div className="bg-[#f0f2f5] px-5 py-3 border-b border-gray-300 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-lg font-bold text-white">
                  {`${selectedConversation.parent_first_name || ""} ${
                    selectedConversation.parent_last_name || ""
                  }`.trim()[0]?.toUpperCase() || "P"}
                </div>
                <div>
                  <div className="font-bold text-gray-900">
                    {`${selectedConversation.parent_first_name || ""} ${
                      selectedConversation.parent_last_name || ""
                    }`.trim()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {`${selectedConversation.student_first_name || ""} ${
                      selectedConversation.student_last_name || ""
                    }`.trim()}
                    {selectedConversation.subject_name
                      ? ` • ${selectedConversation.subject_name}`
                      : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    value={searchInConversation}
                    onChange={(e) => setSearchInConversation(e.target.value)}
                    placeholder="Search in chat..."
                    className="bg-white text-sm pl-12 pr-4 py-3 rounded-2xl outline-none border border-gray-300 focus:border-blue-500 w-64"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLoadParticipants}
                  className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <FaInfoCircle size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 bg-[#e5ddd5] bg-opacity-95">
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
                      <div key={item.id} className="flex justify-center my-6">
                        <span className="text-[11px] px-3 py-1.5 rounded-full bg-gray-300 text-gray-700 bg-opacity-80">
                          {item.label}
                        </span>
                      </div>
                    );
                  }
                  const m = item.data;
                  const isMe = m.sender_type === "teacher";
                  const isRead = !!m.is_read;
                  const showMenu = showMessageMenu === m.message_id;

                  return (
                    <div
                      key={m.message_id}
                      className={`flex mb-4 group ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[70%] flex flex-col">
                        <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                          isMe
                            ? "bg-blue-500 text-white rounded-br-md"
                            : "bg-white text-gray-900 rounded-bl-md border border-gray-200"
                        }`}>
                          {m.message_type === "document" && m.file_url ? (
                            <a
                              href={m.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-2 font-medium ${
                                isMe ? "text-blue-100" : "text-blue-600"
                              } hover:underline`}
                            >
                              <FaPaperclip size={14} />
                              {m.file_name || m.message_text}
                            </a>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">
                              {m.message_text}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 mt-2">
                            <span className={`text-xs ${isMe ? "text-blue-200" : "text-gray-500"}`}>
                              {formatTime(m.created_at)}
                            </span>
                            {isMe && (
                              <span className={isRead ? "text-blue-200" : "text-blue-200"}>
                                {isRead ? <FaCheckDouble size={12} /> : <FaCheck size={12} />}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => setShowMessageMenu(showMenu ? null : m.message_id)}
                            className={`absolute top-2 ${
                              isMe ? "left-2" : "right-2"
                            } opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full ${
                              isMe ? "bg-blue-600" : "bg-gray-200"
                            } flex items-center justify-center`}
                          >
                            <FaEllipsisV size={10} className={isMe ? "text-white" : "text-gray-600"} />
                          </button>

                          {showMenu && (
                            <div className={`absolute top-10 ${
                              isMe ? "left-2" : "right-2"
                            } bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[120px]`}>
                              <button
                                onClick={() => openForwardModal(m.message_id)}
                                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <FaShare size={12} />
                                Forward
                              </button>
                              <button
                                onClick={() => handleSoftDelete(m.message_id)}
                                className="w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <FaTrash size={12} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <form
              onSubmit={handleSend}
              className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-3"
            >
              <label className="cursor-pointer w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-blue-500 hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={fileUploading || !selectedConversation}
                />
                <FaPaperclip size={18} />
              </label>
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white text-xs px-4 py-2.5 rounded-2xl outline-none border border-gray-300 focus:border-blue-500"
              />

              <button
                type="submit"
                disabled={!messageText.trim() || sending || !selectedConversation}
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPaperPlane size={16} />
              </button>
            </form>
          </>
        )}
      </div>

      {showInfo && participants && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <div className="font-bold text-xl text-gray-900">Chat Information</div>
              <button
                onClick={() => setShowInfo(false)}
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
              </div>
              <div className="bg-orange-50 p-4 rounded-xl">
                <div className="text-sm text-orange-700 font-medium mb-1">Teacher</div>
                <div className="font-semibold text-gray-900">
                  {participants.teacher_first_name} {participants.teacher_last_name}
                </div>
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
            </div>
          </div>
        </div>
      )}

      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="font-bold text-xl text-gray-900">New Conversation</div>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setParentSearch("");
                  setParentResults([]);
                  setSelectedClassKey("");
                  setSelectedSubjectId("");
                  setSelectedStudentId("");
                }}
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
                  onChange={(e) => setParentSearch(e.target.value)}
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
                      onClick={() => handleStartConversationForParent(p, p.student_id)}
                      className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 transition-colors"
                    >
                      Start Chat
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
                        setSelectedClassKey(e.target.value);
                        setSelectedSubjectId("");
                        setSelectedStudentId("");
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
                        setSelectedSubjectId(e.target.value);
                        setSelectedStudentId("");
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
                      onChange={(e) => setSelectedStudentId(e.target.value)}
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
                                handleStartConversationForParent(
                                  { parent_id: p.parent_id },
                                  Number(selectedStudentId)
                                )
                              }
                              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm disabled:opacity-50 transition-colors"
                            >
                              Chat
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
      )}

      {showForwardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="font-bold text-xl text-gray-900">Forward Message</div>
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardMessageId(null);
                }}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {conversations
                .filter(
                  (conv) =>
                    !selectedConversation ||
                    conv.conversation_id !== selectedConversation.conversation_id
                )
                .map((conv) => {
                  const name = `${conv.parent_first_name || ""} ${
                    conv.parent_last_name || ""
                  }`.trim();
                  const studentName = `${conv.student_first_name || ""} ${
                    conv.student_last_name || ""
                  }`.trim();
                  return (
                    <button
                      key={conv.conversation_id}
                      type="button"
                      onClick={() => handleForward(conv.conversation_id)}
                      className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                        {name ? name[0].toUpperCase() : "P"}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{name || "Parent"}</div>
                        <div className="text-sm text-gray-600">
                          {studentName}
                          {conv.subject_name ? ` • ${conv.subject_name}` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}

              {conversations.filter(
                (conv) =>
                  !selectedConversation ||
                  conv.conversation_id !== selectedConversation.conversation_id
              ).length === 0 && (
                <div className="text-center text-gray-500 py-8">No other conversations available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}