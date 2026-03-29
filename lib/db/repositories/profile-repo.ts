import { eq } from "drizzle-orm";
import { db } from "../database-context";
import { profile } from "../schema";
import type { GraftType, KneeSide } from "../../types";
import type { Profile, CreateProfileData, UpdateProfileData } from "../../data/data-store.types";

function rowToProfile(row: typeof profile.$inferSelect): Profile {
  return {
    id: row.id,
    name: row.name ?? "",
    username: row.username ?? "",
    surgery_date: row.surgery_date ?? null,
    graft_type: (row.graft_type as GraftType) ?? null,
    knee_side: (row.knee_side as KneeSide) ?? "right",
    created_at: row.created_at ?? "",
  };
}

export async function getProfile(): Promise<Profile | null> {
  const rows = await db.select().from(profile).limit(1);
  if (rows.length === 0) return null;
  return rowToProfile(rows[0]);
}

export async function createProfile(data: CreateProfileData): Promise<Profile> {
  await db.insert(profile).values({
    id: data.id,
    name: data.name,
    username: data.username,
    surgery_date: data.surgery_date ?? null,
    graft_type: data.graft_type ?? null,
    knee_side: data.knee_side,
  });

  const rows = await db.select().from(profile).where(eq(profile.id, data.id));
  if (rows.length === 0) {
    throw new Error("Failed to create profile");
  }
  return rowToProfile(rows[0]);
}

export async function updateProfile(data: UpdateProfileData): Promise<Profile> {
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

  if (Object.keys(updates).length === 0) {
    return rowToProfile(existing[0]);
  }

  await db.update(profile).set(updates).where(eq(profile.id, id));

  const rows = await db.select().from(profile).where(eq(profile.id, id));
  if (rows.length === 0) {
    throw new Error("Failed to read updated profile");
  }
  return rowToProfile(rows[0]);
}
