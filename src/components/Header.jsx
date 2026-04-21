import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaUserCircle, FaUser, FaSignOutAlt } from "react-icons/fa";
import { UserContext } from "./Provider";
import { TeacherLogoutApi } from "../Utility/loginApi";

export default function Header({ toggleSidebar }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { setLoading, profile } = useContext(UserContext);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // const handleLogout = () => {
  //   setLoading(true);
  //   setTimeout(() => {
  //     localStorage.removeItem("token");
  //     localStorage.removeItem("user");
  //     navigate("/");
  //     setLoading(false);
  //   }, 500);
  // };

  const handleLogout = async () => {
    setLoading(true);

    try {
      const res = await TeacherLogoutApi();

      if (res?.status) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
      }
    } catch (error) {
      console.error("Teacher logout failed:", error);
      toast.error(
        error?.response?.data?.message || "Unable to logout. Please try again."
      );
      // ❌ DO NOT clear local storage on failure
    } finally {
      setLoading(false);
      setShowDropdown(false);
    }
  };


  const isUserProfilePage = location.pathname.startsWith("/user-profile");

  return (
    <header className="fixed top-0 left-0 right-0 bg-black text-white p-4 shadow-md flex justify-between items-center z-50 h-16">
      <div className="flex items-center">
        <FaBars
          className="text-2xl cursor-pointer hover:text-gray-300 mr-4"
          onClick={toggleSidebar}
        />
        <div className="text-xl font-bold">Teachers Portal</div>
      </div>

      {!isUserProfilePage && (
        <div className="relative flex items-center" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="focus:outline-none flex items-center space-x-2"
          >
            <span className="text-sm hidden sm:block">
              {profile?.first_name || profile?.last_name
                ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
                : "User"}
            </span>
            {profile?.user_assets?.profile?.length > 0 ? (
              <img
                src={profile.user_assets.profile[0]}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <FaUserCircle className="w-8 h-8 text-gray-400 cursor-pointer" />
            )}
          </button>

          {showDropdown && (
            <div className="absolute top-12 right-0 w-48 bg-white text-black rounded-lg shadow-lg z-50">
              <ul className="py-2">
                <li
                  className="px-4 py-2 hover:bg-gray-200 cursor-pointer flex items-center space-x-2"
                  onClick={() => {
                    navigate("/user-profile");
                    setShowDropdown(false);
                  }}
                >
                  <FaUser className="text-gray-700" />
                  <span>View Profile</span>
                </li>
                <li
                  className="px-4 py-2 hover:bg-red-500 hover:text-white cursor-pointer flex items-center space-x-2"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </header>
  );
}