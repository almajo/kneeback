import "../global.css";
import { useEffect, useRef } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { DatabaseProvider } from "../lib/db/database-context";
import { useSQLiteContext } from "expo-sqlite";
import { getProfile } from "../lib/db/repositories/profile-repo";
import { migrateSupabaseToLocal } from "../lib/db/migration/supabase-to-local";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";

function RootLayoutNav() {
  const db = useSQLiteContext();
  const segments = useSegments();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const migrationInProgress = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    const inTabsGroup = segments[0] === "(tabs)";
    if (!inTabsGroup) return; // Let index.tsx handle initial routing

    const localProfile = getProfile(db);
    if (!localProfile) {
      if (session && !migrationInProgress.current) {
        migrationInProgress.current = true;
        router.replace("/(migration)");
        migrateSupabaseToLocal(db).then(({ error }) => {
          if (error) {
            console.error("[layout] Migration completed with error:", error);
          }
          migrationInProgress.current = false;
          router.replace("/(tabs)/today");
        });
      } else if (!session) {
        router.replace("/(onboarding)/surgery-details");
      }
    }
  }, [segments, db, session, authLoading]);

  return (
    <>
      <Slot />
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}
