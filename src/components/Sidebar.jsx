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
  LuTicket,
  LuChevronDown,
  LuChevronUp,
  LuTrophy,
  LuCalendarDays,
  LuBus
} from "react-icons/lu";
import { FaTimes } from "react-icons/fa";

const navGroups = [
  {
    title: "Main",
    items: [
      { label: "Dashboard",    to: "/dashboard",    icon: LuLayoutDashboard },
      { label: "Timetable",    to: "/timetable",    icon: LuCalendar },
      { label: "Attendance",   to: "/attendance",   icon: LuUsers },
      { label: "My Attendance",to: "/my-attendance",icon: LuUsers },
    ],
  },
  {
    title: "Academic",
    items: [
      { label: "Curriculum",   to: "/curriculum",   icon: LuBookOpen },
      { label: "Exams",        to: "/exams",        icon: LuGraduationCap },
      { label: "Homework",     to: "/homework",     icon: LuFileText },
      { label: "Assignments",  to: "/assignments",  icon: LuFileText },
      { label: "Activities",   to: "/activities",   icon: LuTrophy },
      {
        label: "Events",
        icon: LuCalendarDays,
        subItems: [
          { label: "All Events",   to: "/events" },
          { label: "Certificates", to: "/certificates" },
        ],
      },
      { label: "Results",      to: "/results",      icon: LuFileText },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Leave", to: "/leave", icon: LuFileText },
      { label: "POSH",  to: "/posh",  icon: LuShieldCheck },
      { label: "Chat",  to: "/chat",  icon: LuMessageCircle },
    ],
  },
  {
    title: "Transport",
    items: [
      {
        label: "Transport",
        icon: LuBus,
        subItems: [
          { label: "Students Tracking", to: "/transport/students" },
          { label: "Live Tracking",     to: "/transport/live" },
          { label: "History",           to: "/transport/history" },
        ],
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        label: "Ticket",
        icon: LuTicket,
        subItems: [
          { label: "All Tickets", to: "/tickets" },
          { label: "Analytics",   to: "/ticket-analytics" },
        ],
      },
    ],
  },
];

// ─── Section (nav group) ─────────────────────────────────────────────────────
function Section({ title, items, onNavigate, activePath }) {
  const [openDropdown, setOpenDropdown] = React.useState(null);

  const toggleDropdown = (label) =>
    setOpenDropdown(openDropdown === label ? null : label);

  // exact match OR child path
  const isActive = (to) =>
    activePath === to || (to !== "/" && activePath.startsWith(to + "/"));

  return (
    <div className="mt-4">
      {/* Group title */}
      <div className="px-3 text-[10px] font-bold text-[#f86730] tracking-widest mb-1.5 uppercase">
        {title}
      </div>

      <div className="space-y-0.5">
        {items.map(({ label, to, icon: Icon, subItems }) => {
          const hasSubItems = subItems && subItems.length > 0;
          const isDropdownOpen = openDropdown === label;
          const isAnySubActive =
            hasSubItems && subItems.some((s) => isActive(s.to));

          return (
            <div key={label} className="group">
              {/* ── Parent (dropdown toggle or NavLink) ── */}
              {hasSubItems ? (
                <button
                  type="button"
                  onClick={() => toggleDropdown(label)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all duration-200 focus:outline-none ${
                    isDropdownOpen || isAnySubActive
                      ? "bg-[#1E293B] text-white"
                      : "text-slate-300 hover:bg-[#1E293B] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`text-base flex-shrink-0 ${
                        isDropdownOpen || isAnySubActive
                          ? "text-[#f86730]"
                          : "text-slate-400 group-hover:text-white"
                      }`}
                    />
                    <span className="text-sm font-medium truncate">{label}</span>
                  </div>
                  {isDropdownOpen ? (
                    <LuChevronUp className="text-xs flex-shrink-0 text-[#f86730]" />
                  ) : (
                    <LuChevronDown className="text-xs flex-shrink-0 text-slate-400" />
                  )}
                </button>
              ) : (
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive: active }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      active
                        ? "bg-[#f86730] text-white font-semibold shadow-md shadow-orange-900/20"
                        : "text-slate-300 hover:bg-[#1E293B] hover:text-white font-medium"
                    }`
                  }
                >
                  {({ isActive: active }) => (
                    <>
                      <Icon
                        className={`text-base flex-shrink-0 ${
                          active ? "text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      <span className="text-sm truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              )}

              {/* ── Sub-items ── */}
              {hasSubItems && isDropdownOpen && (
                <div className="ml-4 pl-4 border-l border-slate-700/60 space-y-0.5 mt-1 py-0.5">
                  {subItems.map(({ label: subLabel, to: subTo }) => (
                    <NavLink
                      key={subTo}
                      to={subTo}
                      onClick={onNavigate}
                      className={({ isActive: active }) =>
                        `block px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          active
                            ? "bg-[#f86730] text-white font-medium shadow-md shadow-orange-900/20"
                            : "text-slate-400 hover:bg-[#1E293B] hover:text-white"
                        }`
                      }
                    >
                      {subLabel}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar({ isSidebarOpen, isMobile, toggleSidebar, closeSidebar }) {
  const location = useLocation();

  const handleNavigate = () => {
    if (isMobile) {
      if (closeSidebar) closeSidebar();
      else toggleSidebar?.();
    }
  };

  const closeHandler = () => (closeSidebar ? closeSidebar() : toggleSidebar?.());

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={closeHandler}
          className="fixed inset-0 top-[56px] bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-[56px] left-0 h-[calc(100vh-56px)] w-64
          bg-[#0F172A] text-white
          border-r border-slate-700/50
          shadow-2xl shadow-black/30
          flex flex-col
          transition-all duration-300 ease-in-out
          ${isMobile ? "z-50" : "z-40"}
          ${isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}`}
      >
        {/* Mobile close header */}
        {isMobile && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
            <span className="text-xs font-bold text-[#f86730] uppercase tracking-widest">
              Navigation
            </span>
            <button
              onClick={closeHandler}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
              aria-label="Close sidebar"
            >
              <FaTimes className="text-base" />
            </button>
          </div>
        )}

        {/* Nav items */}
        <nav className="grow p-3 overflow-y-auto overflow-x-hidden side_scrollbar">
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

        {/* Footer branding */}
        <div className="flex-shrink-0 w-full border-t border-slate-700/50 p-4 text-center">
          <h3 className="text-base font-bold tracking-wide text-[#f86730]">Aaplishala</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            &copy; {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </aside>
    </>
  );
}