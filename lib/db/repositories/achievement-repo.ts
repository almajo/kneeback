import { eq, desc } from "drizzle-orm";
import { db } from "../database-context";
import { user_achievements } from "../schema";
import { generateId } from "../../utils/uuid";

export interface LocalUserAchievement {
  id: string;
  content_id: string;
  unlocked_at: string;
  created_at: string;
  updated_at: string;
}

function rowToLocalUserAchievement(
  row: typeof user_achievements.$inferSelect
): LocalUserAchievement {
  return {
    id: row.id,
    content_id: row.content_id,
    unlocked_at: row.unlocked_at,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getUnlockedAchievements(): Promise<LocalUserAchievement[]> {
  const rows = await db
    .select()
    .from(user_achievements)
    .orderBy(desc(user_achievements.unlocked_at));
  return rows.map(rowToLocalUserAchievement);
}

export async function unlockAchievement(
  contentId: string
): Promise<LocalUserAchievement> {
  const existing = await db
    .select()
    .from(user_achievements)
    .where(eq(user_achievements.content_id, contentId));

  if (existing.length > 0) {
    return rowToLocalUserAchievement(existing[0]);
  }

  const id = generateId();
  const unlockedAt = new Date().toISOString();

  await db.insert(user_achievements).values({
    id,
    content_id: contentId,
    unlocked_at: unlockedAt,
  });

  const created = await db
    .select()
    .from(user_achievements)
    .where(eq(user_achievements.id, id));

  if (created.length === 0) {
    throw new Error("Failed to unlock achievement");
  }

  return rowToLocalUserAchievement(created[0]);
}
