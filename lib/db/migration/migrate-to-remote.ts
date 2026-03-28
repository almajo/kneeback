import { db } from "@/lib/db/database-context";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/db/repositories/profile-repo";
import { USER_DATA_TABLES, UserDataTable } from "@/lib/db/user-data-tables";

type SyncRow = Record<string, unknown> & { id: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseTable = any;

// exercise_logs has no user_id column in Supabase — do not inject it
const TABLES_WITHOUT_USER_ID = new Set<UserDataTable>(["exercise_logs"]);

function getSupabaseTable(table: UserDataTable) {
  return supabase.from(table as AnySupabaseTable);
}

function getAllRows(table: UserDataTable): SyncRow[] {
  return db.$client.getAllSync<SyncRow>(`SELECT * FROM ${table}`);
}

function rowsToRemotePayload(rows: SyncRow[], userId: string, table: UserDataTable): SyncRow[] {
  if (TABLES_WITHOUT_USER_ID.has(table)) return rows.map((row) => ({ ...row }));
  return rows.map((row) => ({ ...row, user_id: userId }));
}

/**
 * One-time migration: pushes all local user data tables to Supabase for a given userId.
 * Profile is pushed best-effort — errors are logged but do not fail the migration.
 * Returns { migrated: true } only when at least one row was pushed, so callers can
 * decide whether to purge local data.
 */
export async function migrateLocalToRemote(
  userId: string
): Promise<{ error: string | null; migrated: boolean }> {
  if (!userId) return { error: "userId is required", migrated: false };

  let migrated = false;

  for (const table of USER_DATA_TABLES) {
    const rows = getAllRows(table);
    if (rows.length === 0) continue;

    migrated = true;
    const payload = rowsToRemotePayload(rows, userId, table);
    const { error } = await getSupabaseTable(table).upsert(payload);
    if (error) {
      console.error(`[migrateLocalToRemote] Failed to push ${table}:`, error);
      return { error: `Failed to push ${table}: ${error.message}`, migrated };
    }
  }

  // Push profile (best-effort — log errors, don't fail the whole migration)
  const localProfile = await getProfile();
  if (localProfile) {
    migrated = true;
    const { error: profileError } = await supabase
      .from("profiles" as AnySupabaseTable)
      .upsert({
        id: userId,
        name: localProfile.name,
        username: localProfile.username,
        surgery_date: localProfile.surgery_date,
        graft_type: localProfile.graft_type,
        knee_side: localProfile.knee_side,
        updated_at: localProfile.updated_at,
      });
    if (profileError) {
      console.error(
        "[migrateLocalToRemote] Failed to push profile:",
        profileError
      );
    }
  }

  return { error: null, migrated };
}
