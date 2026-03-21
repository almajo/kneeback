import { eq, sql } from "drizzle-orm";
import { db } from "../database-context";
import { notification_preferences } from "../schema";
import { generateId } from "../../utils/uuid";

export interface LocalNotificationPreferences {
  id: string;
  daily_reminder_time: string;
  evening_nudge_enabled: boolean;
  evening_nudge_time: string;
  completion_congrats_enabled: boolean;
  created_at: string;
  updated_at: string;
}

function rowToLocalNotificationPreferences(
  row: typeof notification_preferences.$inferSelect
): LocalNotificationPreferences {
  return {
    id: row.id,
    daily_reminder_time: row.daily_reminder_time,
    evening_nudge_enabled: row.evening_nudge_enabled === 1,
    evening_nudge_time: row.evening_nudge_time,
    completion_congrats_enabled: row.completion_congrats_enabled === 1,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getNotificationPreferences(): Promise<LocalNotificationPreferences | null> {
  const rows = await db.select().from(notification_preferences).limit(1);
  if (rows.length === 0) return null;
  return rowToLocalNotificationPreferences(rows[0]);
}

export type NotificationPreferencesData = Partial<
  Omit<LocalNotificationPreferences, "id" | "created_at" | "updated_at">
>;

export async function createOrUpdateNotificationPreferences(
  data: NotificationPreferencesData
): Promise<LocalNotificationPreferences> {
  const existing = await db.select().from(notification_preferences).limit(1);

  if (existing.length > 0) {
    const updates: Partial<typeof notification_preferences.$inferInsert> = {};

    if (data.daily_reminder_time !== undefined) updates.daily_reminder_time = data.daily_reminder_time;
    if (data.evening_nudge_enabled !== undefined) updates.evening_nudge_enabled = data.evening_nudge_enabled ? 1 : 0;
    if (data.evening_nudge_time !== undefined) updates.evening_nudge_time = data.evening_nudge_time;
    if (data.completion_congrats_enabled !== undefined) updates.completion_congrats_enabled = data.completion_congrats_enabled ? 1 : 0;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = sql`(datetime('now'))` as unknown as string;
      await db
        .update(notification_preferences)
        .set(updates)
        .where(eq(notification_preferences.id, existing[0].id));
    }

    const updated = await db
      .select()
      .from(notification_preferences)
      .where(eq(notification_preferences.id, existing[0].id));

    if (updated.length === 0) {
      throw new Error("Failed to update notification preferences");
    }

    return rowToLocalNotificationPreferences(updated[0]);
  }

  const id = generateId();
  await db.insert(notification_preferences).values({
    id,
    daily_reminder_time: data.daily_reminder_time ?? "08:00",
    evening_nudge_enabled: data.evening_nudge_enabled ? 1 : 0,
    evening_nudge_time: data.evening_nudge_time ?? "20:00",
    completion_congrats_enabled: data.completion_congrats_enabled !== false ? 1 : 0,
  });

  const created = await db
    .select()
    .from(notification_preferences)
    .where(eq(notification_preferences.id, id));

  if (created.length === 0) {
    throw new Error("Failed to create notification preferences");
  }

  return rowToLocalNotificationPreferences(created[0]);
}
