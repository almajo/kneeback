import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inPublicGroup =
      segments[0] === "(auth)" || segments[0] === "(intro)";

    if (!session && !inPublicGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inPublicGroup) {
      supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            router.replace("/(tabs)/today");
          } else {
            router.replace("/(onboarding)/surgery-details");
          }
        });
    }
  }, [session, loading, segments]);

  if (loading) return null;

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
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
