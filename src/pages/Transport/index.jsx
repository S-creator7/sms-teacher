import React, { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Bus, Navigation, History, Users, MapPin, Clock } from "lucide-react";
import TransportStudents from "./TransportStudents";
import TransportLiveTracking from "./TransportLiveTracking";
import TransportHistory from "./TransportHistory";

const TABS = [
  { id: "students", label: "Students Tracking", icon: Users, path: "/transport/students" },
  { id: "live", label: "Live Tracking", icon: MapPin, path: "/transport/live" },
  { id: "history", label: "History", icon: Clock, path: "/transport/history" },
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

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
           
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#f86730] rounded-lg shadow-sm">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Transport</h1>
                <p className="text-xs text-gray-500 mt-0.5">Track students' school buses in real time</p>
              </div>
            </div>
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
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-[#f86730] text-[#f86730] bg-[#f86730]/5"
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