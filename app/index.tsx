import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem("has_seen_intro")
      .then((value) => {
        if (value === "true") {
          router.replace("/(auth)/sign-in");
        } else {
          router.replace("/(intro)");
        }
      })
      .finally(() => {
        SplashScreen.hideAsync();
      });
  }, []);

  return null;
}
