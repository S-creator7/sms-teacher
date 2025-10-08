import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuCalendar,
  LuUsers,
  LuBookOpen,
  LuGraduationCap,
  LuFileText,
  LuShieldCheck,
  LuMessageCircle,
  LuX,
} from "react-icons/lu";

const navGroups = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LuLayoutDashboard },
      { label: "Timetable", to: "/timetable", icon: LuCalendar },
      { label: "Attendance", to: "/attendance", icon: LuUsers },
    ],
  },
  {
    title: "Academic",
    items: [
      { label: "Curriculum", to: "/curriculum", icon: LuBookOpen },
      { label: "Exams", to: "/exams", icon: LuGraduationCap },
      { label: "Results", to: "/results", icon: LuFileText },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Leave", to: "/leave", icon: LuFileText },
      { label: "POSH", to: "/posh", icon: LuShieldCheck },
      { label: "Chat", to: "/chat", icon: LuMessageCircle },
    ],
  },
];

function Section({ title, items, onNavigate, activePath }) {
  return (
    <div className="mt-6">
      <div className="px-4 text-xs font-bold text-blue-300 tracking-widest mb-3 font-sans uppercase">
        {title}
      </div>
      <div className="flex flex-col">
        {items.map(({ label, to, icon: Icon }) => {
          const active = activePath.startsWith(to);
          return (
            <NavLink
              key={to + label}
              to={to}
              onClick={onNavigate}
              className={() =>
                `mx-2 my-1 flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 select-none font-sans focus-visible:outline-none focus-visible:ring-0 focus-visible:outline-offset-0 ` +
                (active
                  ? `bg-blue-600 text-white shadow-xl border-l-4 border-blue-400`
                  : `text-gray-300 hover:bg-blue-700/50 hover:text-white hover:border-l-4 hover:border-blue-500/50`)
              }
            >
              <Icon className="text-[20px]" />
              <span className="text-sm font-semibold">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar({ isSidebarOpen, isMobile, toggleSidebar }) {
  const location = useLocation();

  const handleNavigate = () => {
    if (isMobile) toggleSidebar?.();
  };

  const sidebarBase = "bg-gray-900 border-r border-gray-700 flex-shrink-0 flex flex-col";
  const sidebarWidth = "w-64";

  return (
    <>
      {isMobile && isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={
          sidebarBase +
          " " +
          sidebarWidth +
          " fixed top-0 left-0 z-40 transform transition-transform duration-300 ease-in-out " +
          (isMobile
            ? isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full")
        }
        style={{
          top: '64px',
          height: 'calc(100vh - 64px)',
          zIndex: 40
        }}
      >
        {isMobile && (
          <button
            onClick={toggleSidebar}
            aria-label="Close sidebar"
            className="absolute right-3 top-3 p-2 rounded-lg hover:bg-blue-800/30 text-white transition-colors z-50 focus-visible:outline-none focus-visible:ring-0 focus-visible:outline-offset-0"
          >
            <LuX className="h-5 w-5" />
          </button>
        )}

        <nav className="flex-1 overflow-y-auto px-1 pb-4 mt-2 side_scrollbar">
          {navGroups.map((group) => (
            <Section
              key={group.title}
              title={group.title}
              items={group.items}
              activePath={location.pathname}
              onNavigate={handleNavigate}
            />
          ))}
        </nav>

        <div className="flex-shrink-0 p-4 text-xs border-t border-gray-700">
          <div className="rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-4 border border-gray-700 shadow-lg">
            <div className="font-bold text-white text-sm font-sans mb-1">Aaplishala</div>
            <div className="text-blue-200 text-sm font-sans mb-2">
              &copy; {new Date().getFullYear()} All rights reserved.
            </div>
          </div>
        </div>
      </aside>

      {!isMobile && isSidebarOpen && (
        <div
          className={sidebarWidth + " flex-shrink-0 transition-all duration-300"}
          style={{
            minHeight: 'calc(100vh - 64px)',
            marginTop: '64px'
          }}
        />
      )}
    </>
  );
}