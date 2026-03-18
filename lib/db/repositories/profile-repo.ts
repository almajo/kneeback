import * as SQLite from "expo-sqlite";
import type { GraftType, KneeSide } from "../../types";

export interface LocalProfile {
  id: string;
  name: string;
  username: string;
  surgery_date: string | null;
  graft_type: GraftType | null;
  knee_side: KneeSide;
  device_id: string;
  supabase_user_id: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

type RawProfile = Omit<LocalProfile, "graft_type" | "knee_side"> & {
  graft_type: string | null;
  knee_side: string;
};

function parseProfile(raw: RawProfile): LocalProfile {
  return {
    ...raw,
    graft_type: (raw.graft_type as GraftType) ?? null,
    knee_side: raw.knee_side as KneeSide,
  };
}

export function getProfile(
  db: SQLite.SQLiteDatabase
): LocalProfile | null {
  const raw = db.getFirstSync<RawProfile>(
    "SELECT * FROM profile LIMIT 1"
  );
  if (!raw) return null;
  return parseProfile(raw);
}

export type CreateProfileData = Omit<LocalProfile, "created_at" | "updated_at">;

export function createProfile(
  db: SQLite.SQLiteDatabase,
  data: CreateProfileData
): LocalProfile {
  db.runSync(
    `INSERT INTO profile
      (id, name, username, surgery_date, graft_type, knee_side, device_id,
       supabase_user_id, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.name,
      data.username,
      data.surgery_date ?? null,
      data.graft_type ?? null,
      data.knee_side,
      data.device_id,
      data.supabase_user_id ?? null,
      data.last_synced_at ?? null,
    ]
  );

  const created = db.getFirstSync<RawProfile>(
    "SELECT * FROM profile WHERE id = ?",
    [data.id]
  );

  if (!created) {
    throw new Error("Failed to create profile");
  }

  return parseProfile(created);
}

export type UpdateProfileData = Partial<
  Omit<LocalProfile, "id" | "created_at" | "updated_at">
>;

export function updateProfile(
  db: SQLite.SQLiteDatabase,
  data: UpdateProfileData
): LocalProfile {
  const existing = db.getFirstSync<RawProfile>(
    "SELECT * FROM profile LIMIT 1"
  );

  if (!existing) {
    throw new Error("No profile found to update");
  }

  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.username !== undefined) {
    fields.push("username = ?");
    values.push(data.username);
  }
  if (data.surgery_date !== undefined) {
    fields.push("surgery_date = ?");
    values.push(data.surgery_date ?? null);
  }
  if (data.graft_type !== undefined) {
    fields.push("graft_type = ?");
    values.push(data.graft_type ?? null);
  }
  if (data.knee_side !== undefined) {
    fields.push("knee_side = ?");
    values.push(data.knee_side);
  }
  if (data.device_id !== undefined) {
    fields.push("device_id = ?");
    values.push(data.device_id);
  }
  if (data.supabase_user_id !== undefined) {
    fields.push("supabase_user_id = ?");
    values.push(data.supabase_user_id ?? null);
  }
  if (data.last_synced_at !== undefined) {
    fields.push("last_synced_at = ?");
    values.push(data.last_synced_at ?? null);
  }

  if (fields.length === 0) {
    return parseProfile(existing);
  }

  fields.push("updated_at = datetime('now')");
  values.push(existing.id);

  db.runSync(
    `UPDATE profile SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  const updated = db.getFirstSync<RawProfile>(
    "SELECT * FROM profile WHERE id = ?",
    [existing.id]
  );

  if (!updated) {
    throw new Error("Failed to read updated profile");
  }

  return parseProfile(updated);
}
