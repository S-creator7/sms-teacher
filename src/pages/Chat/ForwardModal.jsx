import { forwardMessage } from "../../Utility/chatApi";

export default function ForwardModal({ conversations, messageId, onClose }) {
  async function forward(id) {
    await forwardMessage(messageId, { targetConversationId: id });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-96 max-h-[70vh] overflow-y-auto">
        <div className="font-bold mb-4">Forward Message</div>
        {conversations.map((c) => (
          <button
            key={c.conversation_id}
            onClick={() => forward(c.conversation_id)}
            className="w-full text-left p-3 border-b hover:bg-gray-100"
          >
            {c.parent_first_name} {c.parent_last_name}
          </button>
        ))}
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">
          Cancel
        </button>
      </div>
    </div>
  );
}