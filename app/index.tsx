import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSQLiteContext } from "expo-sqlite";
import { getProfile } from "../lib/db/repositories/profile-repo";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const db = useSQLiteContext();

  useEffect(() => {
    AsyncStorage.getItem("has_seen_intro")
      .then((value) => {
        if (value !== "true") {
          router.replace("/(intro)");
        } else {
          const profile = getProfile(db);
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
  }, [db]);

  return null;
}
