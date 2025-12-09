import { useEffect, useState } from "react";
import { getTeacherTickets } from "../../Utility/ticketApi";
import { Link } from "react-router-dom";

export default function TicketList() {
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
    let base = "px-3 py-1 rounded-md text-xs font-semibold";
    switch (status?.toLowerCase()) {
      case "open":
        return base + " bg-red-100 text-red-600";
      case "in progress":
        return base + " bg-yellow-100 text-yellow-700";
      case "resolved":
        return base + " bg-green-100 text-green-600";
      case "closed":
        return base + " bg-gray-200 text-gray-700";
      default:
        return base + " bg-gray-100 text-black";
    }
  };

  return (
    <div className="p-6">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">My Tickets</h1>

        <Link
          to="/tickets/create"
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-black/80"
        >
          Create Ticket
        </Link>
      </div>

      {loading ? (
        <p>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p>No tickets found.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <Link
              to={`/tickets/${t.ticket_id}`}
              key={t.ticket_id}
              className="block bg-white p-4 shadow-md rounded-lg hover:shadow-lg transition"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-lg">{t.title}</h2>
                <span className={getStatusStyle(t.ticket_status)}>
                  {t.ticket_status}
                </span>
              </div>

              <p className="text-gray-500 text-sm mt-1">
                #{t.ticket_number}
              </p>

              <p className="text-gray-700 text-sm mt-1">
                Category: <b>{t.category_name}</b>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
