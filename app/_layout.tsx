import "../global.css";
import { useEffect, useRef } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { DatabaseProvider } from "../lib/db/database-context";
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
  const segments = useSegments();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const migrationInProgress = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    const inTabsGroup = segments[0] === "(tabs)";
    const inSignInScreen = segments[0] === "(auth)" && segments[1] === "sign-in";

    // After sign-in from the sign-in screen, route to the app.
    // Intentionally excludes sign-up: new users must go through onboarding.
    if (session && inSignInScreen) {
      getProfile().then((localProfile) => {
        if (localProfile) {
          router.replace("/(tabs)/today");
        } else if (!migrationInProgress.current) {
          migrationInProgress.current = true;
          router.replace("/(migration)");
          migrateSupabaseToLocal().then(({ error }) => {
            if (error) {
              console.error("[layout] Migration completed with error:", error);
            }
            migrationInProgress.current = false;
            router.replace("/(tabs)/today");
          });
        }
      });
      return;
    }

    if (!inTabsGroup) return; // Let index.tsx handle initial routing

    getProfile().then((localProfile) => {
      if (!localProfile) {
        if (session && !migrationInProgress.current) {
          migrationInProgress.current = true;
          router.replace("/(migration)");
          migrateSupabaseToLocal().then(({ error }) => {
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
    });
  }, [segments, session, authLoading]);

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
