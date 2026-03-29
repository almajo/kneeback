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
 * exercise_logs are deleted via their parent daily_log_ids since
 * the exercise_logs table has no user_id column.
 */
export async function deleteRemoteUserData(userId: string): Promise<void> {
  if (!userId) return;

  // Delete exercise_logs via parent daily_logs (no user_id column on exercise_logs)
  const { data: dailyLogs, error: dailyLogsError } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("user_id", userId);

  if (dailyLogsError) {
    console.error("[deleteRemoteUserData] Failed to fetch daily_logs:", dailyLogsError);
  } else {
    const dailyLogIds = (dailyLogs ?? []).map((row) => row.id);
    if (dailyLogIds.length > 0) {
      const { error } = await supabase
        .from("exercise_logs")
        .delete()
        .in("daily_log_id", dailyLogIds);
      if (error) {
        console.error("[deleteRemoteUserData] Failed to delete exercise_logs:", error);
      }
    }
  }

  // Delete remaining tables that have user_id
  const tablesWithUserId = USER_DATA_TABLES.filter((t) => t !== "exercise_logs");
  for (const table of tablesWithUserId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)(table).delete().eq("user_id", userId);
    if (error) {
      console.error(
        `[deleteRemoteUserData] Failed to delete from ${table}:`,
        error
      );
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (profileError) {
    console.error(
      "[deleteRemoteUserData] Failed to delete profile:",
      profileError
    );
  }
}
