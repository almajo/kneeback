import type { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "../../supabase";
import { resolveConflict } from "./conflict-resolver";
import { getProfile, updateProfile, createProfile } from "../repositories/profile-repo";
import { generateId } from "../../utils/uuid";
import { getDeviceId } from "../../device-identity";

// Tables to sync — catalog tables (exercises, content) are excluded
const USER_DATA_TABLES = [
  "user_exercises",
  "daily_logs",
  "exercise_logs",
  "rom_measurements",
  "milestones",
  "user_achievements",
  "user_gate_criteria",
  "notification_preferences",
] as const;

type TableName = (typeof USER_DATA_TABLES)[number];

type SyncRow = Record<string, unknown> & {
  id: string;
  updated_at: string;
  user_id?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseTable = any;

function getSupabaseTable(table: TableName) {
  // Cast through any to bypass the strict generated Database type constraints.
  // Sync operates on dynamic table names with a uniform SyncRow shape.
  return supabase.from(table as AnySupabaseTable);
}

function getAllRows(db: SQLiteDatabase, table: TableName): SyncRow[] {
  return db.getAllSync<SyncRow>(`SELECT * FROM ${table}`);
}

function upsertLocalRow(db: SQLiteDatabase, table: TableName, row: SyncRow): void {
  const keys = Object.keys(row).filter((k) => k !== "user_id");
  const placeholders = keys.map(() => "?").join(", ");
  const updates = keys.map((k) => `${k} = excluded.${k}`).join(", ");
  const values = keys.map((k) => row[k] as string | number | null);

  // table is constrained to USER_DATA_TABLES (const string union) — not user input
  db.runSync(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`,
    values
  );
}

function rowsToRemotePayload(rows: SyncRow[], userId: string): SyncRow[] {
  return rows.map((row) => ({ ...row, user_id: userId }));
}

export async function pushAll(
  db: SQLiteDatabase,
  userId: string
): Promise<{ error: string | null }> {
  for (const table of USER_DATA_TABLES) {
    const rows = getAllRows(db, table);
    if (rows.length === 0) continue;

    const payload = rowsToRemotePayload(rows, userId);
    const { error } = await getSupabaseTable(table).upsert(payload);
    if (error) {
      return { error: `Failed to push ${table}: ${error.message}` };
    }
  }

  // Push profile (best-effort — log errors, don't fail the whole sync)
  const localProfile = getProfile(db);
  if (localProfile) {
    const { error: profileError } = await supabase.from("profiles" as never).upsert({
      id: userId,
      name: localProfile.name,
      username: localProfile.username,
      surgery_date: localProfile.surgery_date,
      graft_type: localProfile.graft_type,
      knee_side: localProfile.knee_side,
      updated_at: localProfile.updated_at,
    });
    if (profileError) {
      console.error("[pushAll] Failed to push profile:", profileError.message);
    }
  }

  return { error: null };
}

export async function pullAll(
  db: SQLiteDatabase,
  userId: string
): Promise<{ error: string | null }> {
  for (const table of USER_DATA_TABLES) {
    const { data, error } = await getSupabaseTable(table)
      .select("*")
      .eq("user_id", userId);

    if (error) {
      return { error: `Failed to pull ${table}: ${error.message}` };
    }

    if (!data || data.length === 0) continue;

    for (const remoteRow of data as unknown as SyncRow[]) {
      upsertLocalRow(db, table, remoteRow);
    }
  }

  // Pull profile (best-effort — log errors, don't fail the whole sync)
  const { data: remoteProfile, error: profileError } = await supabase
    .from("profiles" as never)
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("[pullAll] Failed to pull profile:", profileError.message);
  } else if (remoteProfile) {
    const rp = remoteProfile as Record<string, unknown>;
    const existingProfile = getProfile(db);
    if (existingProfile) {
      try {
        updateProfile(db, {
          name: rp.name as string | undefined,
          username: rp.username as string | undefined,
          surgery_date: (rp.surgery_date as string | null) ?? null,
          graft_type: (rp.graft_type as import("../../types").GraftType | null) ?? null,
          knee_side: rp.knee_side as import("../../types").KneeSide | undefined,
        });
      } catch (err) {
        console.error("[pullAll] Failed to update local profile:", err);
      }
    } else {
      try {
        const deviceId = await getDeviceId();
        createProfile(db, {
          id: generateId(),
          name: (rp.name as string) ?? (rp.username as string) ?? "",
          username: (rp.username as string) ?? (rp.name as string) ?? "user",
          surgery_date: (rp.surgery_date as string | null) ?? null,
          graft_type: (rp.graft_type as import("../../types").GraftType | null) ?? null,
          knee_side: (rp.knee_side as import("../../types").KneeSide) ?? "right",
          device_id: deviceId,
          supabase_user_id: userId,
          last_synced_at: null,
        });
      } catch (err) {
        console.error("[pullAll] Failed to create local profile from cloud:", err);
      }
    }
  }

  return { error: null };
}

export async function deltaSync(
  db: SQLiteDatabase,
  userId: string,
  lastSyncedAt: string
): Promise<{ error: string | null; syncedAt: string }> {
  for (const table of USER_DATA_TABLES) {
    // Pull changed rows from remote since last sync
    const { data: remoteChanged, error: pullError } = await getSupabaseTable(table)
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", lastSyncedAt);

    if (pullError) {
      return {
        error: `Failed to fetch remote changes for ${table}: ${pullError.message}`,
        syncedAt: lastSyncedAt,
      };
    }

    // Push local rows changed since last sync
    const localChanged = getAllRows(db, table).filter(
      (row) => row.updated_at > lastSyncedAt
    );

    // Apply conflict resolution and write winners to both sides
    const remoteById = new Map<string, SyncRow>(
      ((remoteChanged ?? []) as unknown as SyncRow[]).map((r) => [r.id, r])
    );
    const localById = new Map<string, SyncRow>(
      localChanged.map((r) => [r.id, r])
    );

    const allIds = new Set([...remoteById.keys(), ...localById.keys()]);

    const rowsToRemote: SyncRow[] = [];

    for (const id of allIds) {
      const remote = remoteById.get(id);
      const local = localById.get(id);

      if (remote && local) {
        const winner = resolveConflict(local, remote);
        upsertLocalRow(db, table, winner);
        rowsToRemote.push({ ...winner, user_id: userId });
      } else if (remote) {
        upsertLocalRow(db, table, remote);
      } else if (local) {
        rowsToRemote.push({ ...local, user_id: userId });
      }
    }

    if (rowsToRemote.length > 0) {
      const { error: pushError } = await getSupabaseTable(table).upsert(rowsToRemote);
      if (pushError) {
        return {
          error: `Failed to push changes for ${table}: ${pushError.message}`,
          syncedAt: lastSyncedAt,
        };
      }
    }
  }

  // Reconcile user_exercises deletions: remove remote rows that no longer exist locally
  const localExerciseIds = new Set(
    getAllRows(db, "user_exercises").map((r) => r.id)
  );
  const { data: remoteExerciseRows, error: reconcileError } = await getSupabaseTable("user_exercises")
    .select("id")
    .eq("user_id", userId);
  if (reconcileError) {
    console.error("[deltaSync] Failed to fetch remote exercise IDs for reconciliation:", reconcileError.message);
  } else if (remoteExerciseRows) {
    const toDelete = (remoteExerciseRows as unknown as { id: string }[])
      .map((r) => r.id)
      .filter((id) => !localExerciseIds.has(id));
    for (const id of toDelete) {
      const { error: deleteError } = await getSupabaseTable("user_exercises").delete().eq("id", id);
      if (deleteError) {
        console.error(`[deltaSync] Failed to delete remote exercise ${id}:`, deleteError.message);
      }
    }
  }

  // Sync profile (best-effort — log errors, don't fail the whole sync)
  const { data: remoteProfile, error: remoteProfileError } = await supabase
    .from("profiles" as never)
    .select("*")
    .eq("id", userId)
    .single();

  if (remoteProfileError) {
    console.error("[deltaSync] Failed to fetch remote profile:", remoteProfileError.message);
  } else if (remoteProfile) {
    const rp = remoteProfile as Record<string, unknown> & { updated_at?: string };
    const localProfile = getProfile(db);
    if (localProfile) {
      // Use conflict resolution: whichever was updated more recently wins
      const remoteUpdatedAt = rp.updated_at ?? "";
      const localUpdatedAt = localProfile.updated_at ?? "";
      if (remoteUpdatedAt > localUpdatedAt) {
        // Remote wins — pull into local
        try {
          updateProfile(db, {
            name: rp.name as string | undefined,
            username: rp.username as string | undefined,
            surgery_date: (rp.surgery_date as string | null) ?? null,
            graft_type: (rp.graft_type as import("../../types").GraftType | null) ?? null,
            knee_side: rp.knee_side as import("../../types").KneeSide | undefined,
          });
        } catch (err) {
          console.error("[deltaSync] Failed to update local profile:", err);
        }
      } else {
        // Local wins — push to remote
        const { error: pushProfileError } = await supabase.from("profiles" as never).upsert({
          id: userId,
          name: localProfile.name,
          username: localProfile.username,
          surgery_date: localProfile.surgery_date,
          graft_type: localProfile.graft_type,
          knee_side: localProfile.knee_side,
          updated_at: localProfile.updated_at,
        });
        if (pushProfileError) {
          console.error("[deltaSync] Failed to push profile:", pushProfileError.message);
        }
      }
    }
  }

  // Capture syncedAt just before writing to profile — after all sync operations succeed
  const syncedAt = new Date().toISOString();
  await updateProfile(db, { last_synced_at: syncedAt });

  return { error: null, syncedAt };
}

/**
 * Best-effort deletion of all remote user data.
 * RLS may block some deletes — errors are logged but do not throw.
 */
export async function deleteRemoteUserData(userId: string): Promise<void> {
  for (const table of USER_DATA_TABLES) {
    const { error } = await getSupabaseTable(table).delete().eq("user_id", userId);
    if (error) {
      console.error(`[deleteRemoteUserData] Failed to delete from ${table}:`, error.message);
    }
  }

  const { error: profileError } = await supabase
    .from("profiles" as never)
    .delete()
    .eq("id", userId);
  if (profileError) {
    console.error("[deleteRemoteUserData] Failed to delete profile:", profileError.message);
  }
}
