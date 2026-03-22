import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./database-context";
import {
  exercise_logs,
  user_achievements,
  user_gate_criteria,
  rom_measurements,
  milestones,
  daily_logs,
  user_exercises,
  notification_preferences,
  profile,
} from "./schema";

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
export async function purgeAllUserData(): Promise<void> {
  await db.transaction(async (tx) => {
    // Delete in FK-safe order (children before parents)
    await tx.delete(exercise_logs);
    await tx.delete(user_achievements);
    await tx.delete(user_gate_criteria);
    await tx.delete(rom_measurements);
    await tx.delete(milestones);
    await tx.delete(daily_logs);
    await tx.delete(user_exercises);
    await tx.delete(notification_preferences);
    await tx.delete(profile);
  });

  try {
    await AsyncStorage.multiRemove(ASYNC_STORAGE_KEYS);
  } catch (err) {
    console.error("[purgeAllUserData] Failed to clear AsyncStorage:", err);
  }
}
