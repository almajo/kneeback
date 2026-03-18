import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "./supabase";

type NotificationsModule = typeof import("expo-notifications");
let Notifications: NotificationsModule | null = null;

// expo-notifications is not supported in Expo Go on SDK 53+
const isExpoGo = Constants.executionEnvironment === "storeClient";

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

export async function registerForPushNotifications(userId: string | null): Promise<string | null> {
  if (!Notifications || !Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (userId) {
      await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);
    }
    return token;
  } catch {
    return null;
  }
}

export async function scheduleDailyReminder(hour: number, minute: number) {
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "KneeBack",
        body: "Time to do your exercises. Your knee is waiting.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch {}
}
