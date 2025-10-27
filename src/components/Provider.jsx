import { createContext, useEffect, useState, useCallback } from "react";
import { Profile } from "../Utility/teacherApi";

export const UserContext = createContext();

export default function Provider({ children }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("token") || null);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Profile();
      if (res?.status) {
        setProfile(res?.resources?.data || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Watch for auth token changes and refresh profile accordingly
  useEffect(() => {
    const interval = setInterval(() => {
      const t = localStorage.getItem("token") || null;
      setAuthToken((prev) => (prev !== t ? t : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // When token changes (login/logout/switch user), clear and refetch profile
    setProfile(null);
    if (authToken) {
      refreshProfile();
    }
  }, [authToken, refreshProfile]);

  const contextValue = {
    loading,
    setLoading,
    profile,
    setProfile,
    refreshProfile,
    authToken,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}