import { useState } from "react";
import { View, Text, TouchableOpacity, Switch, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useOnboarding } from "../../lib/onboarding-context";
import { createProfile } from "../../lib/db/repositories/profile-repo";
import { createUserExercise } from "../../lib/db/repositories/user-exercise-repo";
import { createOrUpdateNotificationPreferences } from "../../lib/db/repositories/notification-repo";
import { getDeviceId } from "../../lib/device-identity";
import { generateId } from "../../lib/utils/uuid";
import { registerForPushNotifications, scheduleDailyReminder } from "../../lib/notifications";
import { Colors } from "../../constants/colors";

const MINUTES = [0, 15, 30, 45];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function SetReminder() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { data } = useOnboarding();
  const [hour, setHour] = useState(data.reminderHour);
  const [minute, setMinute] = useState(data.reminderMinute);
  const [eveningNudge, setEveningNudge] = useState(data.eveningNudge);
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);

    try {
      const deviceId = await getDeviceId();

      // Create local profile (single row)
      createProfile(db, {
        id: generateId(),
        name: data.name,
        username: data.username,
        surgery_date: data.surgeryDate,
        graft_type: data.graftType,
        knee_side: data.kneeSide!,
        device_id: deviceId,
        supabase_user_id: null,
        last_synced_at: null,
      });

      // Create user exercises
      data.selectedExercises.forEach((ex, i) => {
        createUserExercise(db, {
          id: generateId(),
          exercise_id: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          hold_seconds: ex.hold_seconds,
          sort_order: i,
        });
      });

      // Create notification preferences
      createOrUpdateNotificationPreferences(db, {
        daily_reminder_time: `${pad(hour)}:${pad(minute)}`,
        evening_nudge_enabled: eveningNudge,
        evening_nudge_time: "20:00",
        completion_congrats_enabled: true,
      });

      // Schedule local push notifications (no userId needed for local notifications)
      await registerForPushNotifications(null);
      await scheduleDailyReminder(hour, minute);

      router.replace("/(tabs)/today");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-6 pt-14">
      <Text className="text-3xl font-bold text-primary mb-2">Almost there</Text>
      <Text className="text-base mb-8" style={{ color: "#6B6B6B" }}>
        Set a daily reminder so your knee doesn't have to ask twice.
      </Text>

      <Text className="text-sm font-semibold mb-4" style={{ color: "#2D2D2D" }}>Daily reminder time</Text>

      <View className="flex-row gap-3 mb-6">
        <View className="flex-1">
          <Text className="text-xs mb-2 text-center" style={{ color: "#A0A0A0" }}>Hour</Text>
          <View className="bg-surface border border-border rounded-2xl overflow-hidden" style={{ height: 160 }}>
            {[hour - 1, hour, hour + 1].map((h) => {
              const normalized = ((h % 24) + 24) % 24;
              return (
                <TouchableOpacity
                  key={h}
                  className={`flex-1 items-center justify-center ${normalized === hour ? "bg-primary/10" : ""}`}
                  onPress={() => setHour(normalized)}
                >
                  <Text className={`text-lg font-bold ${normalized === hour ? "text-primary" : ""}`}
                    style={normalized !== hour ? { color: "#A0A0A0" } : undefined}>
                    {pad(normalized)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="flex-1">
          <Text className="text-xs mb-2 text-center" style={{ color: "#A0A0A0" }}>Minute</Text>
          <View className="bg-surface border border-border rounded-2xl overflow-hidden" style={{ height: 160 }}>
            {MINUTES.map((m) => (
              <TouchableOpacity
                key={m}
                className={`flex-1 items-center justify-center ${m === minute ? "bg-primary/10" : ""}`}
                onPress={() => setMinute(m)}
              >
                <Text className={`text-lg font-bold ${m === minute ? "text-primary" : ""}`}
                  style={m !== minute ? { color: "#A0A0A0" } : undefined}>
                  {pad(m)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between bg-surface border border-border rounded-2xl px-5 py-4 mb-10">
        <View className="flex-1 mr-4">
          <Text className="font-semibold" style={{ color: "#2D2D2D" }}>Evening nudge</Text>
          <Text className="text-sm" style={{ color: "#6B6B6B" }}>
            Reminder at 8 PM if you haven't logged yet
          </Text>
        </View>
        <Switch
          value={eveningNudge}
          onValueChange={setEveningNudge}
          trackColor={{ true: Colors.primary }}
        />
      </View>

      <TouchableOpacity
        className={`bg-primary rounded-2xl py-4 items-center ${saving ? "opacity-50" : ""}`}
        onPress={handleFinish}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">Start Recovery 🦵</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
