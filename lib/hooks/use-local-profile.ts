import { useSQLiteContext } from "expo-sqlite";
import { useState, useEffect } from "react";
import { getProfile, type LocalProfile } from "../db/repositories/profile-repo";

export function useLocalProfile() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = getProfile(db);
    setProfile(p);
    setLoading(false);
  }, [db]);

  function refetch() {
    setProfile(getProfile(db));
  }

  return { profile, loading, refetch };
}
