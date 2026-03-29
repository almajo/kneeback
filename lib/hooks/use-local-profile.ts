import { useState, useEffect } from "react";
import { useDataStore } from "../data/data-store-context";
import type { Profile } from "../data/data-store.types";

export function useLocalProfile() {
  const store = useDataStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.getProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [store]);

  async function refetch() {
    setProfile(await store.getProfile());
  }

  return { profile, loading, refetch };
}
