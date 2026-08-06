import { useEffect, useState } from "react";
import { getTeacherTickets } from "../../Utility/ticketApi";
import { Link, useNavigate } from "react-router-dom";
import { Plus, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

export default function TicketList() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    setLoading(true);
    const res = await getTeacherTickets();
    setLoading(false);

    if (res.status) {
      setTickets(res.resources.data);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const getStatusStyle = (status) => {
    let base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
    switch (status?.toLowerCase()) {
      case "open":
        return base + " bg-red-50 text-red-700";
      case "in progress":
        return base + " bg-yellow-50 text-yellow-700";
      case "resolved":
        return base + " bg-green-50 text-green-700";
      case "closed":
        return base + " bg-gray-100 text-gray-700";
      default:
        return base + " bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return <AlertCircle className="w-3 h-3" />;
      case "in progress":
        return <Clock className="w-3 h-3" />;
      case "resolved":
        return <CheckCircle className="w-3 h-3" />;
      case "closed":
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">My Tickets</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {tickets.length > 0 
                  ? `${tickets.length} ticket${tickets.length > 1 ? 's' : ''} found` 
                  : "Manage your support tickets"}
              </p>
            </div>
          </div>
          <Link
            to="/tickets/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#f86730] text-white rounded-lg hover:bg-[#e55a29] transition text-sm font-medium shadow-sm hover:shadow"
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </Link>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#f86730] border-t-transparent"></div>
            <p className="mt-3 text-sm text-gray-500">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-[#f86730]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#f86730]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">No tickets found</h3>
            <p className="text-xs text-gray-500">Create your first ticket to get started</p>
            <Link
              to="/tickets/create"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#f86730] text-white rounded-lg hover:bg-[#e55a29] transition text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Ticket
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Link
                to={`/tickets/${t.ticket_id}`}
                key={t.ticket_id}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-[#f86730]/30 transition-all group"
              >
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-sm text-gray-800 group-hover:text-[#f86730] transition-colors truncate">
                          {t.title}
                        </h2>
                        <span className="text-xs text-gray-400 font-mono">
                          #{t.ticket_number}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Category: <span className="font-medium text-gray-700">{t.category_name}</span>
                      </p>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={getStatusStyle(t.ticket_status)}>
                        {getStatusIcon(t.ticket_status)}
                        {t.ticket_status}
                      </span>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-[#f86730] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}