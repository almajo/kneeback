import { db } from "@/lib/db/database-context";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/db/repositories/profile-repo";
import { USER_DATA_TABLES, UserDataTable } from "@/lib/db/user-data-tables";

type SyncRow = Record<string, unknown> & {
  id: string;
  updated_at: string;
  user_id?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseTable = any;

function getSupabaseTable(table: UserDataTable) {
  return supabase.from(table as AnySupabaseTable);
}

function getAllRows(table: UserDataTable): SyncRow[] {
  return db.$client.getAllSync<SyncRow>(`SELECT * FROM ${table}`);
}

function rowsToRemotePayload(rows: SyncRow[], userId: string): SyncRow[] {
  return rows.map((row) => ({ ...row, user_id: userId }));
}

/**
 * One-time migration: pushes all local user data tables to Supabase for a given userId.
 * Profile is pushed best-effort — errors are logged but do not fail the migration.
 *
 * NOTE: This function fails fast on the first table error, which means the remote store
 * may be left partially migrated. This is safe because all writes use upsert — retrying
 * from scratch is always safe and will produce the correct final state.
 */
export async function migrateLocalToRemote(
  userId: string
): Promise<{ error: string | null }> {
  if (!userId) return { error: "userId is required" };

  for (const table of USER_DATA_TABLES) {
    const rows = getAllRows(table);
    if (rows.length === 0) continue;

    const payload = rowsToRemotePayload(rows, userId);
    const { error } = await getSupabaseTable(table).upsert(payload);
    if (error) {
      console.error(`[migrateLocalToRemote] Failed to push ${table}:`, error);
      return { error: `Failed to push ${table}: ${error.message}` };
    }
  }

  // Push profile (best-effort — log errors, don't fail the whole migration)
  const localProfile = await getProfile();
  if (localProfile) {
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

  return { error: null };
}
