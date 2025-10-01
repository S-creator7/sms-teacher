import { createContext, useEffect, useState, useCallback } from "react";
import { Profile } from "../Utility/teacherApi";

export const UserContext = createContext();

let didInit = false;

export default function Provider({ children }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

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

  useEffect(() => {
    if (didInit) return;
    didInit = true;
    refreshProfile();
  }, [refreshProfile]);

  const contextValue = {
    loading,
    setLoading,
    profile,
    setProfile,
    refreshProfile,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}