import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Users,
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  Video
} from "lucide-react";

import {
  listStaffMeetingsApi,
  joinStaffMeetingApi
} from "../Utility/staffMeetingApi";

export default function StaffMeetings() {
  const [meetingsList, setMeetingsList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Fetch Meetings
  useEffect(() => {
    fetchMeetings();
  }, [currentPage, filterStatus]);

  const fetchMeetings = async () => {
    setListLoading(true);
    try {
      const res = await listStaffMeetingsApi({ page: currentPage, limit: 10 });
      const rawMeetings = res?.resources?.data?.meetings || res?.data?.meetings || [];
      const pagination = res?.resources?.data?.pagination || res?.data?.pagination || {};
      
      let filtered = [...rawMeetings];

      if (filterStatus) {
        filtered = filtered.filter(m => getMeetingStatus(m.start_time, m.end_time) === filterStatus);
      }

      setMeetingsList(filtered);
      setTotalPages(pagination.total_pages || 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load staff meetings");
    } finally {
      setListLoading(false);
    }
  };

  // Date formatting helpers
  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Status calculation
  const getMeetingStatus = (start, end) => {
    const now = new Date().getTime();
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (now >= startTime && now <= endTime) {
      return "Live";
    } else if (now < startTime) {
      return "Upcoming";
    } else {
      return "Completed";
    }
  };

  // Join staff meeting
  const handleJoinMeeting = async (meeting) => {
    try {
      const res = await joinStaffMeetingApi(meeting.meeting_unique_id);
      const url = res?.resources?.data?.join_url || res?.data?.join_url;
      if (url) {
        window.open(url, "_blank");
        toast.success("Joining staff room...");
      } else {
        toast.error("Unable to find meeting link");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to join staff meeting");
    }
  };

  // Copy invitation
  const handleCopyInvite = (meeting) => {
    const timeStr = formatDateTime(meeting.start_time);
    const text = `Staff Meeting Invite:
Topic: ${meeting.title}
Host: ${meeting.creator_name || "Administrator"}
Time: ${timeStr}
Meeting ID: ${meeting.meeting_unique_id}
Please log in to your Aaplishala portal to attend this conference.`;

    navigator.clipboard.writeText(text);
    setCopiedId(meeting.meeting_unique_id);
    toast.success("Meeting details copied!");
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Text search filtering
  const filteredMeetingsList = useMemo(() => {
    if (!searchQuery.trim()) return meetingsList;
    return meetingsList.filter(m =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [meetingsList, searchQuery]);

  return (
    <div className="p-4 md:p-6 space-y-6 font-sans text-base text-black bg-gray-50 min-h-screen">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            Staff Meetings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Attend administrative staff discussions, panel reviews, and administrative rooms.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search meetings by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Live">Live Rooms</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
          </select>

          <button
            onClick={fetchMeetings}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Grid listing */}
      {listLoading ? (
        <div className="bg-white rounded-xl border border-gray-250 py-16 text-center text-gray-500 font-semibold">
          Loading staff meetings...
        </div>
      ) : filteredMeetingsList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetingsList.map((meeting) => {
            const status = getMeetingStatus(meeting.start_time, meeting.end_time);
            return (
              <div
                key={meeting.meeting_unique_id}
                className="bg-white rounded-xl border border-gray-200 hover:border-indigo-400 shadow-sm hover:shadow transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-4">
                  {/* Status Badge */}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      Staff Room
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                        status === "Live"
                          ? "bg-green-150 text-green-700 animate-pulse border-green-200"
                          : status === "Upcoming"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {status === "Live" && <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>}
                      {status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {meeting.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-semibold">
                      Organizer: {meeting.creator_name || "School Administrator"}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 h-10 overflow-hidden">
                      {meeting.description || "No specific meeting details provided."}
                    </p>
                  </div>

                  {/* Timing details */}
                  <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-450" />
                      <span>{formatDateTime(meeting.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-450" />
                      <span>
                        Until {new Date(meeting.end_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopyInvite(meeting)}
                    title="Copy Meeting Invite"
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  >
                    {copiedId === meeting.meeting_unique_id ? <Check className="w-4.5 h-4.5 text-green-600" /> : <Copy className="w-4.5 h-4.5" />}
                  </button>

                  <button
                    onClick={() => handleJoinMeeting(meeting)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition ${
                      status === "Live"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    Join Room
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 px-6 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-4 rounded-full bg-indigo-50 text-indigo-650">
            <Users className="w-9 h-9" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-gray-800 font-sans">No staff meetings found</h3>
            <p className="text-sm text-gray-500 font-sans">
              You haven't been invited to any upcoming or live administrative staff meetings yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
