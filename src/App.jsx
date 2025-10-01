import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import Provider, { UserContext } from "./components/Provider";
import Loader from "./components/loader";
import { Toaster } from "react-hot-toast";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import UserProfile from "./pages/UserProfile"
import Timetable from "./pages/Timetable";
import Attendance from "./pages/Attendance";

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const location = useLocation();
  const { loading } = useContext(UserContext);

  const hideSidebar = ["/", "/login"].includes(location.pathname);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");

    const handleResize = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    mediaQuery.addEventListener("change", handleResize);
    handleResize();

    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  // Simple route guards
  const isAuthed = Boolean(localStorage.getItem("token"));

  const ProtectedRoute = ({ children }) => {
    return isAuthed ? children : <Navigate to="/login" replace />;
  };

  const PublicRoute = ({ children }) => {
    return isAuthed ? <Navigate to="/dashboard" replace /> : children;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Toaster position="top-center" />
      {loading && <Loader />}

      {!hideSidebar && (
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      )}

      <div className="flex flex-1 w-full relative">
        {!hideSidebar && (
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            isMobile={isMobile}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        )}

        <main
          className={`flex-grow transition-all duration-300 ${!hideSidebar ? 'pt-16' : ''
            }`}
          style={{
            width: !hideSidebar && isSidebarOpen && !isMobile
              ? 'calc(100% - 256px)'
              : '100%',
            marginLeft: 'auto',
            minHeight: 'calc(100vh - 64px)'
          }}
        >
          <div className="p-6">
            <Routes>
              <Route
                path="/"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timetable"
                element={
                  <ProtectedRoute>
                    <Timetable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute>
                    <Attendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user-profile/*"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Provider>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;