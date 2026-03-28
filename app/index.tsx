import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDataStore } from "../lib/data/data-store-context";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const store = useDataStore();

  useEffect(() => {
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
  }, [store]);

  return null;
}
