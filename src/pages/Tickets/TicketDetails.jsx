import { useEffect, useState } from "react";
import {
    getTeacherTicketDetails,
    addTeacherTicketComment,
    uploadTeacherTicketAttachment,
} from "../../Utility/ticketApi";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LuArrowLeft } from "react-icons/lu";


export default function TicketDetails() {
    const { ticketId } = useParams();
    const navigate = useNavigate();

    const [ticket, setTicket] = useState(null);
    const [comment, setComment] = useState("");

    const loadDetails = async () => {
        const res = await getTeacherTicketDetails(ticketId);
        if (res.status) {
            setTicket(res.resources.data);
        }
    };

    useEffect(() => {
        loadDetails();
    }, []);

    const submitComment = async () => {
        if (!comment.trim()) return;
        const res = await addTeacherTicketComment(ticketId, comment);
        if (res.status) {
            toast.success("Comment added");
            setComment("");
            loadDetails();
        }
    };

    const uploadFile = async (e) => {
        const file = e.target.files[0];
        const res = await uploadTeacherTicketAttachment(ticketId, file);
        if (res.status) {
            toast.success("Attachment uploaded");
            loadDetails();
        }
    };

    if (!ticket) return <p>Loading...</p>;

    return (
        <div className="p-6 mx-auto">

            {/* Back Button */}
            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                >
                    <LuArrowLeft size={22} />
                </button>
                <h1 className="text-2xl font-bold">Ticket Details</h1>
            </div>

            {/* Header & Status */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">{ticket.title}</h1>
                    <p className="text-gray-500 mt-1 text-sm">#{ticket.ticket_number}</p>
                </div>

                <span
                    className={`px-4 py-1 rounded-full text-sm font-semibold shadow 
                    ${ticket.ticket_status === "Open"
                            ? "bg-red-100 text-red-600"
                            : ticket.ticket_status === "In Progress"
                                ? "bg-yellow-100 text-yellow-700"
                                : ticket.ticket_status === "Resolved"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-gray-200 text-gray-700"
                        }`}
                >
                    {ticket.ticket_status}
                </span>
            </div>

            {/* Ticket Info */}
            <div className="bg-white w-full p-5 rounded-xl shadow-md mt-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Ticket Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700 text-sm">
                    <p><b>Category:</b> {ticket.category_name}</p>
                    <p><b>Priority:</b> {ticket.priority}</p>
                    <p><b>School:</b> {ticket.school_name}</p>
                    <p><b>Created At:</b> {new Date(ticket.created_at).toLocaleString()}</p>
                    <p><b>Updated At:</b> {new Date(ticket.updated_at).toLocaleString()}</p>
                </div>

                <p className="mt-4 text-gray-700"><b>Description:</b> {ticket.description}</p>
            </div>

            {/* Attachments */}
            <div className="mt-10 bg-white w-full p-5 rounded-xl shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Attachments</h2>

                <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition">
                    <span className="text-gray-600">Click to upload file</span>
                    <input type="file" className="hidden" onChange={uploadFile} />
                </label>

                {/* List of files */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {ticket.attachments.map((a) => (
                        <a
                            key={a.attachment_id}
                            href={a.file_path}
                            target="_blank"
                            className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition"
                        >
                            <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 rounded-lg font-semibold">
                                {a.file_type?.includes("pdf") ? "PDF" : "FILE"}
                            </div>

                            <div className="flex-1">
                                <p className="font-medium text-sm text-gray-800">{a.file_name}</p>
                                <p className="text-xs text-gray-500">{a.file_type}</p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>

            {/* Comments */}
            <div className="mt-10 bg-white w-full p-5 rounded-xl shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Comments</h2>

                <textarea
                    className="w-full border border-gray-300 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400"
                    placeholder="Write a comment..."
                    rows="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />

                <button
                    onClick={submitComment}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg mt-3 hover:bg-blue-700 transition"
                >
                    Add Comment
                </button>

                {/* Comment List */}
                <div className="mt-6 space-y-4">
                    {ticket.comments.map((c) => (
                        <div key={c.comment_id} className="flex gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-300 rounded-full text-sm font-bold text-white">
                                {c.commenter_username?.charAt(0)?.toUpperCase()}
                            </div>

                            <div>
                                <p className="text-gray-800">{c.comment_text}</p>
                                <p className="text-xs text-gray-500 mt-1">— {c.commenter_username}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
