import { eq, desc } from "drizzle-orm";
import { db } from "../database-context";
import { user_achievements } from "../schema";
import { generateId } from "../../utils/uuid";
import type { UserAchievement } from "../../data/data-store.types";

function rowToUserAchievement(
  row: typeof user_achievements.$inferSelect
): UserAchievement {
  return {
    id: row.id,
    content_id: row.content_id,
    unlocked_at: row.unlocked_at,
  };
}

export async function getUnlockedAchievements(): Promise<UserAchievement[]> {
  const rows = await db
    .select()
    .from(user_achievements)
    .orderBy(desc(user_achievements.unlocked_at));
  return rows.map(rowToUserAchievement);
}

export async function unlockAchievement(
  contentId: string
): Promise<UserAchievement> {
  const existing = await db
    .select()
    .from(user_achievements)
    .where(eq(user_achievements.content_id, contentId));

  if (existing.length > 0) {
    return rowToUserAchievement(existing[0]);
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

  return rowToUserAchievement(created[0]);
}
