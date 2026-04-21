import React, { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Bus, Navigation, History } from "lucide-react";
import TransportStudents from "./TransportStudents";
import TransportLiveTracking from "./TransportLiveTracking";
import TransportHistory from "./TransportHistory";

const TABS = [
  { id: "students", label: "Students Tracking", icon: Bus, path: "/transport/students" },
  { id: "live", label: "Live Tracking", icon: Navigation, path: "/transport/live" },
  { id: "history", label: "History", icon: History, path: "/transport/history" },
];

const Transport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [preSelected, setPreSelected] = useState(null);

  const activeTab =
    TABS.find((t) => location.pathname.startsWith(t.path))?.id || "students";

  const handleStudentSelect = (student) => {
    setPreSelected(student);
    navigate("/transport/live");
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-64px)] bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 pt-5 pb-0 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-md">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Transport</h1>
            <p className="text-xs text-gray-500">Track students' school buses in real time</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon, path }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route
            index
            element={<TransportStudents onSelectStudent={handleStudentSelect} />}
          />
          <Route
            path="students"
            element={<TransportStudents onSelectStudent={handleStudentSelect} />}
          />
          <Route
            path="live"
            element={
              <TransportLiveTracking
                preSelected={preSelected}
                key={preSelected?.student_id}
              />
            }
          />
          <Route
            path="history"
            element={<TransportHistory preSelected={preSelected} />}
          />
        </Routes>
      </div>
    </div>
  );
};

export default Transport;
