import { db } from "../database-context";
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

interface NotificationPreferencesRow {
  id: string;
  daily_reminder_time: string;
  evening_nudge_enabled: number;
  evening_nudge_time: string;
  completion_congrats_enabled: number;
  created_at: string | null;
  updated_at: string | null;
}

function rowToLocalNotificationPreferences(
  row: NotificationPreferencesRow
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
  const row = await db.$client.getFirstAsync<NotificationPreferencesRow>(
    "SELECT * FROM notification_preferences LIMIT 1"
  );
  if (!row) return null;
  return rowToLocalNotificationPreferences(row);
}

export type NotificationPreferencesData = Partial<
  Omit<LocalNotificationPreferences, "id" | "created_at" | "updated_at">
>;

export async function createOrUpdateNotificationPreferences(
  data: NotificationPreferencesData
): Promise<LocalNotificationPreferences> {
  const expo = db.$client;
  const existing = await expo.getFirstAsync<{ id: string }>(
    "SELECT id FROM notification_preferences LIMIT 1"
  );

  if (existing) {
    const setClauses: string[] = [];
    const values: (string | number)[] = [];

    if (data.daily_reminder_time !== undefined) {
      setClauses.push("daily_reminder_time = ?");
      values.push(data.daily_reminder_time);
    }
    if (data.evening_nudge_enabled !== undefined) {
      setClauses.push("evening_nudge_enabled = ?");
      values.push(data.evening_nudge_enabled ? 1 : 0);
    }
    if (data.evening_nudge_time !== undefined) {
      setClauses.push("evening_nudge_time = ?");
      values.push(data.evening_nudge_time);
    }
    if (data.completion_congrats_enabled !== undefined) {
      setClauses.push("completion_congrats_enabled = ?");
      values.push(data.completion_congrats_enabled ? 1 : 0);
    }

    if (setClauses.length > 0) {
      setClauses.push("updated_at = datetime('now')");
      values.push(existing.id);
      await expo.runAsync(
        `UPDATE notification_preferences SET ${setClauses.join(", ")} WHERE id = ?`,
        values
      );
    }

    const updated = await expo.getFirstAsync<NotificationPreferencesRow>(
      "SELECT * FROM notification_preferences WHERE id = ?",
      [existing.id]
    );
    if (!updated) throw new Error("Failed to update notification preferences");
    return rowToLocalNotificationPreferences(updated);
  }

  const id = generateId();
  await expo.runAsync(
    `INSERT INTO notification_preferences (id, daily_reminder_time, evening_nudge_enabled, evening_nudge_time, completion_congrats_enabled)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      data.daily_reminder_time ?? "08:00",
      data.evening_nudge_enabled ? 1 : 0,
      data.evening_nudge_time ?? "20:00",
      data.completion_congrats_enabled !== false ? 1 : 0,
    ]
  );

  const created = await expo.getFirstAsync<NotificationPreferencesRow>(
    "SELECT * FROM notification_preferences WHERE id = ?",
    [id]
  );
  if (!created) throw new Error("Failed to create notification preferences");
  return rowToLocalNotificationPreferences(created);
}
