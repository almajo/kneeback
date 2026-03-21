import { useState, useEffect } from "react";
import { getProfile, type LocalProfile } from "../db/repositories/profile-repo";

export function useLocalProfile() {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  async function refetch() {
    setProfile(await getProfile());
  }

  return { profile, loading, refetch };
}
