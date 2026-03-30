import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDataStore } from "../lib/data/data-store-context";
import { useAuth } from "../lib/auth-context";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const store = useDataStore();
  const { loading } = useAuth();

  useEffect(() => {
    // Wait for auth session to restore before deciding the route.
    // Without this, a signed-in user's session is null on first render,
    // causing the LocalDataStore to return no profile and routing to onboarding.
    if (loading) return;

    AsyncStorage.getItem("has_seen_intro")
      .then(async (value) => {
        if (value !== "true") {
          router.replace("/(intro)");
        } else {
          const profile = await store.getProfile();
          if (profile) {
            router.replace("/(tabs)/today");
          } else {
            router.replace("/(onboarding)/surgery-details");
          }
        }
      })
      .finally(() => {
        SplashScreen.hideAsync();
      });
  }, [store, loading]);

  return null;
}
