import { eq, sql } from "drizzle-orm";
import { db } from "../database-context";
import { profile } from "../schema";
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

function rowToLocalProfile(row: typeof profile.$inferSelect): LocalProfile {
  return {
    id: row.id,
    name: row.name ?? "",
    username: row.username ?? "",
    surgery_date: row.surgery_date ?? null,
    graft_type: (row.graft_type as GraftType) ?? null,
    knee_side: (row.knee_side as KneeSide) ?? "right",
    device_id: row.device_id ?? "",
    supabase_user_id: row.supabase_user_id ?? null,
    last_synced_at: row.last_synced_at ?? null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getProfile(): Promise<LocalProfile | null> {
  const rows = await db.select().from(profile).limit(1);
  if (rows.length === 0) return null;
  return rowToLocalProfile(rows[0]);
}

export type CreateProfileData = Omit<LocalProfile, "created_at" | "updated_at">;

export async function createProfile(
  data: CreateProfileData
): Promise<LocalProfile> {
  await db.insert(profile).values({
    id: data.id,
    name: data.name,
    username: data.username,
    surgery_date: data.surgery_date ?? null,
    graft_type: data.graft_type ?? null,
    knee_side: data.knee_side,
    device_id: data.device_id,
    supabase_user_id: data.supabase_user_id ?? null,
    last_synced_at: data.last_synced_at ?? null,
  });

  const rows = await db.select().from(profile).where(eq(profile.id, data.id));
  if (rows.length === 0) {
    throw new Error("Failed to create profile");
  }
  return rowToLocalProfile(rows[0]);
}

export type UpdateProfileData = Partial<
  Omit<LocalProfile, "id" | "created_at" | "updated_at">
>;

export async function updateProfile(
  data: UpdateProfileData
): Promise<LocalProfile> {
  const existing = await db.select().from(profile).limit(1);
  if (existing.length === 0) {
    throw new Error("No profile found to update");
  }

  const id = existing[0].id;
  const updates: Partial<typeof profile.$inferInsert> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.username !== undefined) updates.username = data.username;
  if (data.surgery_date !== undefined) updates.surgery_date = data.surgery_date ?? null;
  if (data.graft_type !== undefined) updates.graft_type = data.graft_type ?? null;
  if (data.knee_side !== undefined) updates.knee_side = data.knee_side;
  if (data.device_id !== undefined) updates.device_id = data.device_id;
  if (data.supabase_user_id !== undefined) updates.supabase_user_id = data.supabase_user_id ?? null;
  if (data.last_synced_at !== undefined) updates.last_synced_at = data.last_synced_at ?? null;

  if (Object.keys(updates).length === 0) {
    return rowToLocalProfile(existing[0]);
  }

  updates.updated_at = sql`(datetime('now'))` as unknown as string;

  await db.update(profile).set(updates).where(eq(profile.id, id));

  const rows = await db.select().from(profile).where(eq(profile.id, id));
  if (rows.length === 0) {
    throw new Error("Failed to read updated profile");
  }
  return rowToLocalProfile(rows[0]);
}
