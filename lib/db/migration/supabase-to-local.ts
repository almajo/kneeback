import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "../../supabase";
import { getDeviceId } from "../../device-identity";
import { createProfile, getProfile } from "../repositories/profile-repo";

const MIGRATION_KEY = "migration_v1_complete";

export async function isMigrationComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(MIGRATION_KEY);
  return val === "true";
}

export async function migrateSupabaseToLocal(
  db: SQLiteDatabase
): Promise<{ error: string | null }> {
  if (await isMigrationComplete()) return { error: null };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: null };

  const existing = getProfile(db);
  if (existing) {
    await AsyncStorage.setItem(MIGRATION_KEY, "true");
    return { error: null };
  }

  const { data: remoteProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  if (profileError) {
    console.error("[migration] Failed to fetch remote profile:", profileError.message);
    return { error: profileError.message };
  }

  const deviceId = await getDeviceId();

  try {
    createProfile(db, {
      id: crypto.randomUUID(),
      name: remoteProfile.name ?? remoteProfile.username ?? "",
      username: remoteProfile.username ?? remoteProfile.name ?? "user",
      surgery_date: remoteProfile.surgery_date ?? null,
      graft_type: remoteProfile.graft_type ?? null,
      knee_side: remoteProfile.knee_side ?? "right",
      device_id: deviceId,
      supabase_user_id: session.user.id,
      last_synced_at: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[migration] Failed to create local profile:", message);
    return { error: message };
  }

  const results = await Promise.allSettled([
    migrateTable(db, session.user.id, "user_exercises"),
    migrateTable(db, session.user.id, "daily_logs"),
    migrateTable(db, session.user.id, "exercise_logs"),
    migrateTable(db, session.user.id, "rom_measurements"),
    migrateTable(db, session.user.id, "milestones"),
  ]);

  results.forEach((result, index) => {
    const tables = ["user_exercises", "daily_logs", "exercise_logs", "rom_measurements", "milestones"];
    if (result.status === "rejected") {
      console.error(`[migration] Table migration failed for ${tables[index]}:`, result.reason);
    }
  });

  await AsyncStorage.setItem(MIGRATION_KEY, "true");
  return { error: null };
}

async function migrateTable(
  db: SQLiteDatabase,
  userId: string,
  table: string
): Promise<void> {
  const { data: rows, error } = await supabase
    .from(table as never)
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to fetch ${table} from Supabase: ${error.message}`);
  }

  if (!rows || rows.length === 0) return;

  for (const row of rows) {
    try {
      const columns = Object.keys(row as Record<string, unknown>);
      const placeholders = columns.map(() => "?").join(", ");
      const values = columns.map((col) => (row as Record<string, unknown>)[col]);

      db.runSync(
        `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
        values as (string | number | null)[]
      );
    } catch (rowErr) {
      console.error(
        `[migration] Failed to insert row into ${table}:`,
        rowErr instanceof Error ? rowErr.message : String(rowErr)
      );
    }
  }
}
