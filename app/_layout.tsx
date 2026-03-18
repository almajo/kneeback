import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "../lib/auth-context";
import { DatabaseProvider } from "../lib/db/database-context";
import { useSQLiteContext } from "expo-sqlite";
import { getProfile } from "../lib/db/repositories/profile-repo";
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

  useEffect(() => {
    const inTabsGroup = segments[0] === "(tabs)";
    if (!inTabsGroup) return; // Let index.tsx handle initial routing

    const localProfile = getProfile(db);
    if (!localProfile) {
      router.replace("/(onboarding)/surgery-details");
    }
  }, [segments, db]);

  return (
    <>
      <Slot />
      <StatusBar style="auto" />
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
