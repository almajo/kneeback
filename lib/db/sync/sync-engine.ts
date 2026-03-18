import type { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "../../supabase";
import { resolveConflict } from "./conflict-resolver";
import { updateProfile } from "../repositories/profile-repo";

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

  return { error: null };
}

export async function deltaSync(
  db: SQLiteDatabase,
  userId: string,
  lastSyncedAt: string
): Promise<{ error: string | null; syncedAt: string }> {
  const syncedAt = new Date().toISOString();

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

  // Record successful sync time on local profile
  updateProfile(db, { last_synced_at: syncedAt });

  return { error: null, syncedAt };
}
