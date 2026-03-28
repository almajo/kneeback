import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { supabase } from "./supabase";
import { type Session } from "@supabase/supabase-js";
import { migrateLocalToRemote } from "@/lib/db/migration/migrate-to-remote";
import { purgeAllUserData } from "@/lib/db/purge-user-data";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("[AuthProvider] getSession failed:", error.message);
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);

      if (event === "SIGNED_IN" && s?.user.id) {
        const userId = s.user.id;
        try {
          const { error: migrationError } = await migrateLocalToRemote(userId);
          if (migrationError) {
            console.error("[AuthProvider] Migration to remote failed:", migrationError);
            // Don't block login — user can still use remote store
          } else {
            await purgeAllUserData();
          }
        } catch (err) {
          console.error("[AuthProvider] Unexpected error during sign-in migration:", err);
          // Don't block login — user can still use remote store
        }
      }

      if (event === "SIGNED_OUT") {
        try {
          await purgeAllUserData();
        } catch (err) {
          console.error("[AuthProvider] Failed to purge local data on sign-out:", err);
        }
        router.replace("/(intro)");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(
    email: string,
    password: string
  ): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }

  async function signUp(
    email: string,
    password: string
  ): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
