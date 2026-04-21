import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Bus,
  Users,
  MapPin,
  Signal,
  Route,
  Hash,
  BookOpen,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  User,
} from "lucide-react";
import { getStudentsTracking } from "../../Utility/transportApi";

const TransportStudents = ({ onSelectStudent }) => {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentsTracking();
      const data = res?.resources?.data || res?.data || [];
      setStudents(data);
      setFiltered(data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load students tracking info.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(students);
    } else {
      setFiltered(
        students.filter(
          (s) =>
            `${s.first_name} ${s.middle_name || ""} ${s.last_name}`
              .toLowerCase()
              .includes(q) ||
            s.admission_number?.toLowerCase().includes(q) ||
            s.vehicle_number?.toLowerCase().includes(q) ||
            s.route_name?.toLowerCase().includes(q) ||
            s.class_name?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, students]);

  const getInitials = (s) =>
    `${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div className="p-4 md:p-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Students Tracking</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Students in your classrooms with assigned transport
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
            <Users className="w-4 h-4" />
            {students.length} Students
          </span>
          <button
            onClick={loadStudents}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, admission no., vehicle, route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Bus className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {search ? "No matching students" : "No students with transport"}
          </h3>
          <p className="text-sm text-gray-500 max-w-xs">
            {search
              ? "Try adjusting your search query."
              : "Students in your classrooms with transport allocations will appear here."}
          </p>
        </div>
      )}

      {/* Student Cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student) => (
            <div
              key={student.student_id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer"
              onClick={() => onSelectStudent?.(student)}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                    {getInitials(student)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {student.first_name}{" "}
                      {student.middle_name ? student.middle_name + " " : ""}
                      {student.last_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ADM: {student.admission_number}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Class & Section */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-50 rounded-lg">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-xs text-gray-600">
                    <span className="font-medium">{student.class_name}</span>
                    {student.section_name ? ` — Section ${student.section_name}` : ""}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
                    <Hash className="w-3 h-3" />
                    Roll {student.roll_number}
                  </span>
                </div>

                {/* Vehicle */}
                {student.vehicle_number && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <Bus className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">
                      {student.vehicle_number}
                    </span>
                  </div>
                )}

                {/* Route */}
                {student.route_name && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-50 rounded-lg">
                      <Route className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-600 truncate">{student.route_name}</span>
                  </div>
                )}

                {/* IMEI */}
                {student.imei && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-50 rounded-lg">
                      <Signal className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <span className="text-xs font-mono text-gray-500 truncate">
                      {student.imei}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              {student.imei && (
                <div className="px-4 pb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStudent?.(student);
                    }}
                    className="w-full py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Track Live Location
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransportStudents;
