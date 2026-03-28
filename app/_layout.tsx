import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { DatabaseProvider } from "../lib/db/database-context";
import { DataStoreProvider, useDataStore } from "../lib/data/data-store-context";
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
  const store = useDataStore();

  useEffect(() => {
    if (authLoading) return;

    const inTabsGroup = segments[0] === "(tabs)";
    const inSignInScreen = segments[0] === "(auth)" && segments[1] === "sign-in";

    // After sign-in from the sign-in screen, route to the app.
    // Intentionally excludes sign-up: new users must go through onboarding.
    if (session && inSignInScreen) {
      router.replace("/(tabs)/today");
      return;
    }

    if (!inTabsGroup) return; // Let index.tsx handle initial routing

    store.getProfile().then((localProfile) => {
      if (!localProfile) {
        if (session) {
          router.replace("/(tabs)/today");
        } else if (!session) {
          router.replace("/(onboarding)/surgery-details");
        }
      }
    });
  }, [segments, session, authLoading, store]);

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
          <DataStoreProvider>
            <RootLayoutNav />
          </DataStoreProvider>
        </AuthProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}
