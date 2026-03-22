import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProfile } from "../lib/db/repositories/profile-repo";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem("has_seen_intro")
      .then(async (value) => {
        if (value !== "true") {
          router.replace("/(intro)");
        } else {
          const profile = await getProfile();
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
  }, []);

  return null;
}
