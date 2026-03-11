import { useEffect, useReducer, useRef, useMemo } from "react";
import ConversationSidebar from "./ConversationSidebar";
import ChatWindow from "./ChatWindow";
import ChatInfoModal from "./ChatInfoModal";
import NewChatModal from "./NewChatModal";
import ForwardModal from "./ForwardModal";
import {
  getConversations,
  getMessages,
  markConversationRead,
  getUnreadCount,
  subscribeUnreadCount,
  archiveConversation,
  unarchiveConversation,
  searchMessages as searchMessagesApi,
  getConversationParticipants,
  softDeleteMessage,
  forwardMessage,
  uploadChatFile,
  getClassStudentParents,
  searchParents,
  startConversation,
  sendMessage,
} from "../../Utility/chatApi";

const initialState = {
  conversations: [],
  pagination: null,
  selectedConversation: null,
  messages: [],
  filteredMessages: null,
  unreadCount: 0,
  conversationStatus: "active",
  searchChat: "",
  loadingConversations: false,
  loadingMessages: false,
  sending: false,
  fileUploading: false,
  participants: null,
  parentSearch: "",
  parentResults: [],
  classParents: [],
  loadingClassParents: false,
  selectedClassKey: "",
  selectedSubjectId: "",
  selectedStudentId: "",
  startingConversation: false,
  searchingParents: false,
  unreadSubscription: null,
  ui: {
    info: false,
    newChat: false,
    forward: false,
    forwardMessageId: null,
    showMessageMenu: null,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload };
    case "SET_PAGINATION":
      return { ...state, pagination: action.payload };
    case "SELECT_CONVERSATION":
      return { ...state, selectedConversation: action.payload, filteredMessages: null, showMessageMenu: null };
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };
    case "FILTER_MESSAGES":
      return { ...state, filteredMessages: action.payload };
    case "UNREAD":
      return { ...state, unreadCount: action.payload };
    case "SET_CONVERSATION_STATUS":
      return { ...state, conversationStatus: action.payload };
    case "SET_SEARCH_CHAT":
      return { ...state, searchChat: action.payload };
    case "LOADING_CONVERSATIONS":
      return { ...state, loadingConversations: action.payload };
    case "LOADING_MESSAGES":
      return { ...state, loadingMessages: action.payload };
    case "SENDING":
      return { ...state, sending: action.payload };
    case "FILE_UPLOADING":
      return { ...state, fileUploading: action.payload };
    case "SET_PARTICIPANTS":
      return { ...state, participants: action.payload };
    case "SET_PARENT_SEARCH":
      return { ...state, parentSearch: action.payload };
    case "SET_PARENT_RESULTS":
      return { ...state, parentResults: action.payload };
    case "SET_CLASS_PARENTS":
      return { ...state, classParents: action.payload };
    case "LOADING_CLASS_PARENTS":
      return { ...state, loadingClassParents: action.payload };
    case "SET_SELECTED_CLASS_KEY":
      return { ...state, selectedClassKey: action.payload, selectedSubjectId: "", selectedStudentId: "" };
    case "SET_SELECTED_SUBJECT_ID":
      return { ...state, selectedSubjectId: action.payload, selectedStudentId: "" };
    case "SET_SELECTED_STUDENT_ID":
      return { ...state, selectedStudentId: action.payload };
    case "STARTING_CONVERSATION":
      return { ...state, startingConversation: action.payload };
    case "SEARCHING_PARENTS":
      return { ...state, searchingParents: action.payload };
    case "SET_UNREAD_SUBSCRIPTION":
      return { ...state, unreadSubscription: action.payload };
    case "SHOW_MESSAGE_MENU":
      return { ...state, showMessageMenu: action.payload };
    case "UI":
      return { ...state, ui: { ...state.ui, ...action.payload } };
    default:
      return state;
  }
}

export default function ChatLayout() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const activeConv = useRef(null);

  async function loadConversations(extra = {}) {
    try {
      dispatch({ type: "LOADING_CONVERSATIONS", payload: true });
      const res = await getConversations({
        page: 1,
        limit: 50,
        search: state.searchChat || undefined,
        status: state.conversationStatus,
        ...extra,
      });
      const data = res?.resources?.data;
      dispatch({ type: "SET_CONVERSATIONS", payload: data?.conversations || [] });
      dispatch({ type: "SET_PAGINATION", payload: data?.pagination || null });
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: "LOADING_CONVERSATIONS", payload: false });
    }
  }

  async function loadMessages(conv) {
    if (!conv) return;
    try {
      dispatch({ type: "LOADING_MESSAGES", payload: true });
      activeConv.current = conv.conversation_id;
      const res = await getMessages(conv.conversation_id, {
        page: 1,
        limit: 50,
      });
      if (activeConv.current !== conv.conversation_id) return;
      dispatch({ type: "SET_MESSAGES", payload: res?.resources?.data || [] });
      await markConversationRead(conv.conversation_id);
      await loadUnread();
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: "LOADING_MESSAGES", payload: false });
    }
  }

  async function loadUnread() {
    try {
      const res = await getUnreadCount();
      dispatch({ type: "UNREAD", payload: res?.resources?.unread_count || 0 });
    } catch {}
  }

  async function loadUnreadSubscription() {
    try {
      const res = await subscribeUnreadCount();
      dispatch({ type: "SET_UNREAD_SUBSCRIPTION", payload: res?.resources?.subscription || null });
    } catch (e) {
      console.error(e);
    }
  }

  async function loadClassParents() {
    try {
      dispatch({ type: "LOADING_CLASS_PARENTS", payload: true });
      const res = await getClassStudentParents();
      const data = res?.resources?.data;
      dispatch({ type: "SET_CLASS_PARENTS", payload: Array.isArray(data) ? data : [] });
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: "LOADING_CLASS_PARENTS", payload: false });
    }
  }

  async function handleArchive(conv) {
    try {
      await archiveConversation(conv.conversation_id);
      await loadConversations();
      if (
        state.selectedConversation?.conversation_id === conv.conversation_id &&
        state.conversationStatus === "active"
      ) {
        dispatch({ type: "SELECT_CONVERSATION", payload: null });
        dispatch({ type: "SET_MESSAGES", payload: [] });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUnarchive(conv) {
    try {
      await unarchiveConversation(conv.conversation_id);
      await loadConversations();
      if (state.selectedConversation?.conversation_id === conv.conversation_id) {
        dispatch({ type: "SELECT_CONVERSATION", payload: null });
        dispatch({ type: "SET_MESSAGES", payload: [] });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLoadParticipants() {
    if (!state.selectedConversation) return;
    try {
      const res = await getConversationParticipants(
        state.selectedConversation.conversation_id
      );
      dispatch({ type: "SET_PARTICIPANTS", payload: res?.resources?.data || null });
      dispatch({ type: "UI", payload: { info: true } });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSoftDelete(messageId) {
    try {
      await softDeleteMessage(messageId);
      if (state.selectedConversation) {
        await loadMessages(state.selectedConversation);
      }
      dispatch({ type: "SHOW_MESSAGE_MENU", payload: null });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleForward(targetConversationId) {
    try {
      if (!state.ui.forwardMessageId || !targetConversationId) return;
      await forwardMessage(state.ui.forwardMessageId, {
        targetConversationId,
      });
      if (state.selectedConversation) {
        await loadMessages(state.selectedConversation);
      }
      dispatch({ type: "UI", payload: { forward: false, forwardMessageId: null } });
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadConversations();
    loadUnread();
    loadUnreadSubscription();
  }, [state.conversationStatus]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadConversations();
    }, 400);
    return () => clearTimeout(t);
  }, [state.searchChat]);

  useEffect(() => {
    if (!state.ui.newChat || !state.parentSearch.trim()) return;
    const t = setTimeout(async () => {
      try {
        dispatch({ type: "SEARCHING_PARENTS", payload: true });
        const res = await searchParents({
          search: state.parentSearch,
          page: 1,
          limit: 20,
        });
        const data = res?.resources?.data;
        dispatch({ type: "SET_PARENT_RESULTS", payload: data?.parents || [] });
      } catch (e) {
        console.error(e);
      } finally {
        dispatch({ type: "SEARCHING_PARENTS", payload: false });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [state.parentSearch, state.ui.newChat]);

  useEffect(() => {
    if (state.ui.newChat && state.classParents.length === 0 && !state.loadingClassParents) {
      loadClassParents();
    }
  }, [state.ui.newChat, state.classParents.length, state.loadingClassParents]);

  return (
    <div className="flex h-screen bg-slate-900">
      <ConversationSidebar
        conversations={state.conversations}
        unread={state.unreadCount}
        loadingConversations={state.loadingConversations}
        conversationStatus={state.conversationStatus}
        searchChat={state.searchChat}
        unreadSubscription={state.unreadSubscription}
        selectedConversation={state.selectedConversation}
        onSelect={(c) => {
          dispatch({ type: "SELECT_CONVERSATION", payload: c });
          loadMessages(c);
        }}
        onNewChat={() => dispatch({ type: "UI", payload: { newChat: true } })}
        onSearch={(value) => dispatch({ type: "SET_SEARCH_CHAT", payload: value })}
        onStatusChange={(status) => dispatch({ type: "SET_CONVERSATION_STATUS", payload: status })}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
      />

      <ChatWindow
        conversation={state.selectedConversation}
        messages={state.filteredMessages ?? state.messages}
        loadingMessages={state.loadingMessages}
        sending={state.sending}
        fileUploading={state.fileUploading}
        showMessageMenu={state.showMessageMenu}
        onSearch={(res) => dispatch({ type: "FILTER_MESSAGES", payload: res })}
        onClearSearch={() => dispatch({ type: "FILTER_MESSAGES", payload: null })}
        onInfo={handleLoadParticipants}
        onForward={(id) =>
          dispatch({ type: "UI", payload: { forward: true, forwardMessageId: id } })
        }
        onSendMessage={async (messageData) => {
          if (!state.selectedConversation) return;
          try {
            dispatch({ type: "SENDING", payload: true });
            const res = await sendMessage(state.selectedConversation.conversation_id, messageData);
            const msg = res?.resources?.data;
            if (msg) {
              dispatch({ type: "SET_MESSAGES", payload: [...state.messages, msg] });
            }
            await loadConversations();
            return msg;
          } catch (e) {
            console.error(e);
            throw e;
          } finally {
            dispatch({ type: "SENDING", payload: false });
          }
        }}
        onFileUpload={async (file) => {
          if (!state.selectedConversation || !file) return;
          try {
            dispatch({ type: "FILE_UPLOADING", payload: true });
            const uploadRes = await uploadChatFile(file);
            const fileInfo = uploadRes?.resources?.file;
            if (!fileInfo?.url) return null;

            const res = await sendMessage(state.selectedConversation.conversation_id, {
              messageText: fileInfo.name || file.name,
              messageType: "document",
              fileUrl: fileInfo.url,
              fileName: fileInfo.name,
              fileSize: fileInfo.size,
            });
            const msg = res?.resources?.data;
            if (msg) {
              dispatch({ type: "SET_MESSAGES", payload: [...state.messages, msg] });
            }
            await loadConversations();
            return msg;
          } catch (err) {
            console.error(err);
            throw err;
          } finally {
            dispatch({ type: "FILE_UPLOADING", payload: false });
          }
        }}
        onShowMessageMenu={(messageId) => dispatch({ type: "SHOW_MESSAGE_MENU", payload: messageId })}
        onDeleteMessage={handleSoftDelete}
      />

      {state.ui.info && (
        <ChatInfoModal
          conversation={state.selectedConversation}
          participants={state.participants}
          onClose={() => dispatch({ type: "UI", payload: { info: false } })}
        />
      )}

      {state.ui.newChat && (
        <NewChatModal
          onClose={() => {
            dispatch({ type: "UI", payload: { newChat: false } });
            dispatch({ type: "SET_PARENT_SEARCH", payload: "" });
            dispatch({ type: "SET_PARENT_RESULTS", payload: [] });
            dispatch({ type: "SET_SELECTED_CLASS_KEY", payload: "" });
            dispatch({ type: "SET_SELECTED_SUBJECT_ID", payload: "" });
            dispatch({ type: "SET_SELECTED_STUDENT_ID", payload: "" });
          }}
          onCreated={loadConversations}
          parentSearch={state.parentSearch}
          parentResults={state.parentResults}
          searchingParents={state.searchingParents}
          classParents={state.classParents}
          loadingClassParents={state.loadingClassParents}
          selectedClassKey={state.selectedClassKey}
          selectedSubjectId={state.selectedSubjectId}
          selectedStudentId={state.selectedStudentId}
          startingConversation={state.startingConversation}
          onParentSearch={(value) => dispatch({ type: "SET_PARENT_SEARCH", payload: value })}
          onSelectClassKey={(key) => dispatch({ type: "SET_SELECTED_CLASS_KEY", payload: key })}
          onSelectSubjectId={(id) => dispatch({ type: "SET_SELECTED_SUBJECT_ID", payload: id })}
          onSelectStudentId={(id) => dispatch({ type: "SET_SELECTED_STUDENT_ID", payload: id })}
          onStartConversation={async (parent, studentId) => {
            if (!parent?.parent_id || !studentId) return;
            try {
              dispatch({ type: "STARTING_CONVERSATION", payload: true });
              const res = await startConversation({
                parentId: parent.parent_id,
                studentId,
              });
              const conv = res?.resources?.data || res?.resources?.conversation;
              await loadConversations();
              if (conv?.conversation_id) {
                const found =
                  state.conversations.find(
                    (c) => c.conversation_id === conv.conversation_id
                  ) || conv;
                dispatch({ type: "SELECT_CONVERSATION", payload: found });
                loadMessages(found);
              }
              dispatch({ type: "UI", payload: { newChat: false } });
              dispatch({ type: "SET_PARENT_SEARCH", payload: "" });
              dispatch({ type: "SET_PARENT_RESULTS", payload: [] });
              dispatch({ type: "SET_SELECTED_CLASS_KEY", payload: "" });
              dispatch({ type: "SET_SELECTED_SUBJECT_ID", payload: "" });
              dispatch({ type: "SET_SELECTED_STUDENT_ID", payload: "" });
            } catch (e) {
              console.error(e);
            } finally {
              dispatch({ type: "STARTING_CONVERSATION", payload: false });
            }
          }}
        />
      )}

      {state.ui.forward && (
        <ForwardModal
          conversations={state.conversations}
          messageId={state.ui.forwardMessageId}
          selectedConversation={state.selectedConversation}
          onClose={() => dispatch({ type: "UI", payload: { forward: false, forwardMessageId: null } })}
          onForward={handleForward}
        />
      )}
    </div>
  );
}