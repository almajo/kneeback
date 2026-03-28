import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./database-context";
import { supabase } from "@/lib/supabase";
import { USER_DATA_TABLES } from "@/lib/db/user-data-tables";

const ASYNC_STORAGE_KEYS = [
  "has_seen_intro",
  "device_id",
  "device_animal_name",
  "migration_v1_complete",
];

/**
 * Deletes all user data from SQLite (preserves catalog tables + schema).
 * Clears AsyncStorage flags to reset app to fresh-install state.
 *
 * Uses expo-sqlite's async API directly to avoid a deadlock that occurs when
 * Drizzle's sync transaction wrapper is combined with an async callback on web.
 */
export async function purgeAllUserData(): Promise<void> {
  const expo = db.$client;
  await expo.execAsync("BEGIN");
  try {
    // Delete in FK-safe order (children before parents)
    await expo.execAsync("DELETE FROM exercise_logs");
    await expo.execAsync("DELETE FROM user_achievements");
    await expo.execAsync("DELETE FROM user_gate_criteria");
    await expo.execAsync("DELETE FROM rom_measurements");
    await expo.execAsync("DELETE FROM milestones");
    await expo.execAsync("DELETE FROM daily_logs");
    await expo.execAsync("DELETE FROM user_exercises");
    await expo.execAsync("DELETE FROM notification_preferences");
    await expo.execAsync("DELETE FROM profile");
    await expo.execAsync("COMMIT");
  } catch (err) {
    await expo.execAsync("ROLLBACK");
    throw err;
  }

  try {
    await AsyncStorage.multiRemove(ASYNC_STORAGE_KEYS);
  } catch (err) {
    console.error("[purgeAllUserData] Failed to clear AsyncStorage:", err);
  }
}

/**
 * Best-effort deletion of all remote user data from Supabase.
 * RLS may block some deletes — errors are logged but do not throw.
 */
export async function deleteRemoteUserData(userId: string): Promise<void> {
  if (!userId) return;

  for (const table of USER_DATA_TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from(table as any).delete().eq("user_id", userId);
    if (error) {
      console.error(
        `[deleteRemoteUserData] Failed to delete from ${table}:`,
        error
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await supabase
    .from("profiles" as never)
    .delete()
    .eq("id", userId);
  if (profileError) {
    console.error(
      "[deleteRemoteUserData] Failed to delete profile:",
      profileError
    );
  }
}
