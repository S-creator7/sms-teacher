import { useEffect, useState } from "react";
import {
    getTeacherTicketDetails,
    addTeacherTicketComment,
    uploadTeacherTicketAttachment,
} from "../../Utility/ticketApi";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { 
    ArrowLeft, 
    Paperclip, 
    Send, 
    File, 
    FileText, 
    User,
    Clock,
    Calendar,
    Tag,
    AlertCircle,
    CheckCircle,
    XCircle
} from "lucide-react";

export default function TicketDetails() {
    const { ticketId } = useParams();
    const navigate = useNavigate();

    const [ticket, setTicket] = useState(null);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

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
        setSubmitting(true);
        const res = await addTeacherTicketComment(ticketId, comment);
        if (res.status) {
            toast.success("Comment added successfully");
            setComment("");
            loadDetails();
        }
        setSubmitting(false);
    };

    const uploadFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size should be less than 5MB");
            return;
        }
        
        const res = await uploadTeacherTicketAttachment(ticketId, file);
        if (res.status) {
            toast.success("Attachment uploaded successfully");
            loadDetails();
        }
    };

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case "open":
                return "bg-red-50 text-red-700 border-red-200";
            case "in progress":
                return "bg-yellow-50 text-yellow-700 border-yellow-200";
            case "resolved":
                return "bg-green-50 text-green-700 border-green-200";
            case "closed":
                return "bg-gray-100 text-gray-700 border-gray-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case "open":
                return <AlertCircle className="w-4 h-4" />;
            case "in progress":
                return <Clock className="w-4 h-4" />;
            case "resolved":
                return <CheckCircle className="w-4 h-4" />;
            case "closed":
                return <XCircle className="w-4 h-4" />;
            default:
                return null;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case "high":
                return "text-red-600 bg-red-50 border-red-200";
            case "medium":
                return "text-yellow-600 bg-yellow-50 border-yellow-200";
            case "low":
                return "text-green-600 bg-green-50 border-green-200";
            default:
                return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    if (!ticket) return (
        <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#f86730] border-t-transparent"></div>
                    <p className="mt-3 text-sm text-gray-500">Loading ticket details...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header with Back Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors duration-200 group"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Ticket Details</h1>
                            <p className="text-xs text-gray-500 mt-0.5">#{ticket.ticket_number}</p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusStyle(ticket.ticket_status)}`}>
                        {getStatusIcon(ticket.ticket_status)}
                        {ticket.ticket_status}
                    </span>
                </div>

                {/* Ticket Title */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <h2 className="text-base font-semibold text-gray-800">{ticket.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Category: <span className="font-medium text-gray-700">{ticket.category_name}</span></p>
                </div>

                {/* Ticket Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-700">Ticket Information</h2>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-start gap-2">
                                <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Category</p>
                                    <p className="text-sm font-medium text-gray-800">{ticket.category_name}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Priority</p>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">School</p>
                                    <p className="text-sm font-medium text-gray-800">{ticket.school_name}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Created At</p>
                                    <p className="text-sm font-medium text-gray-800">{new Date(ticket.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:col-span-2">
                                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500">Updated At</p>
                                    <p className="text-sm font-medium text-gray-800">{new Date(ticket.updated_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Description</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{ticket.description}</p>
                        </div>
                    </div>
                </div>

                {/* Attachments */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">Attachments</h2>
                        <span className="text-xs text-gray-500">{ticket.attachments?.length || 0} files</span>
                    </div>
                    <div className="p-4">
                        <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[#f86730] hover:bg-[#f86730]/5 transition group">
                            <div className="flex flex-col items-center gap-1">
                                <Paperclip className="w-6 h-6 text-gray-400 group-hover:text-[#f86730] transition" />
                                <span className="text-sm text-gray-500 group-hover:text-[#f86730] transition">Click to upload file</span>
                                <span className="text-xs text-gray-400">Max 5MB</span>
                            </div>
                            <input type="file" className="hidden" onChange={uploadFile} />
                        </label>

                        {/* List of files */}
                        {ticket.attachments?.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                {ticket.attachments.map((a) => (
                                    <a
                                        key={a.attachment_id}
                                        href={a.file_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-[#f86730] hover:shadow-sm transition group"
                                    >
                                        <div className="w-10 h-10 flex items-center justify-center bg-[#f86730]/10 text-[#f86730] rounded-lg font-semibold text-xs">
                                            {a.file_type?.includes("pdf") ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-800 truncate group-hover:text-[#f86730] transition">{a.file_name}</p>
                                            <p className="text-xs text-gray-500">{a.file_type || "File"}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Comments */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">Comments</h2>
                        <span className="text-xs text-gray-500">{ticket.comments?.length || 0} comments</span>
                    </div>
                    <div className="p-4">
                        {/* Comment Input */}
                        <div className="flex gap-2">
                            <textarea
                                className="flex-1 border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-[#f86730]/20 focus:border-[#f86730] transition resize-none"
                                placeholder="Write a comment..."
                                rows="3"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        submitComment();
                                    }
                                }}
                            />
                        </div>
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={submitComment}
                                disabled={!comment.trim() || submitting}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                    !comment.trim() || submitting
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-[#f86730] text-white hover:bg-[#e55a29] shadow-sm hover:shadow"
                                }`}
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Comment
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Comment List */}
                        {ticket.comments?.length > 0 && (
                            <div className="mt-4 space-y-3">
                                {ticket.comments.map((c) => (
                                    <div key={c.comment_id} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="w-8 h-8 flex items-center justify-center bg-[#f86730] rounded-full text-xs font-bold text-white flex-shrink-0">
                                            {c.commenter_username?.charAt(0)?.toUpperCase() || "U"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-medium text-gray-800">{c.commenter_username}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(c.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-0.5 break-words">{c.comment_text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}