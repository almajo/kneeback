import type { SQLiteDatabase } from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

// User data tables in FK-safe deletion order
const USER_DATA_TABLES_PURGE_ORDER = [
  "exercise_logs",
  "user_achievements",
  "user_gate_criteria",
  "rom_measurements",
  "milestones",
  "daily_logs",
  "user_exercises",
  "notification_preferences",
  "profile",
] as const;

const ASYNC_STORAGE_KEYS = [
  "has_seen_intro",
  "device_id",
  "device_animal_name",
  "migration_v1_complete",
];

/**
 * Deletes all user data from SQLite (preserves catalog tables + schema).
 * Clears AsyncStorage flags to reset app to fresh-install state.
 */
export async function purgeAllUserData(db: SQLiteDatabase): Promise<void> {
  for (const table of USER_DATA_TABLES_PURGE_ORDER) {
    try {
      db.runSync(`DELETE FROM ${table}`);
    } catch (err) {
      console.error(`[purgeAllUserData] Failed to delete from ${table}:`, err);
    }
  }

  try {
    await AsyncStorage.multiRemove(ASYNC_STORAGE_KEYS);
  } catch (err) {
    console.error("[purgeAllUserData] Failed to clear AsyncStorage:", err);
  }
}
