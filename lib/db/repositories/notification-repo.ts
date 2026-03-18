import * as SQLite from "expo-sqlite";

export interface LocalNotificationPreferences {
  id: string;
  daily_reminder_time: string;
  evening_nudge_enabled: boolean;
  evening_nudge_time: string;
  completion_congrats_enabled: boolean;
  created_at: string;
  updated_at: string;
}

type RawNotificationPreferences = Omit<
  LocalNotificationPreferences,
  "evening_nudge_enabled" | "completion_congrats_enabled"
> & {
  evening_nudge_enabled: number;
  completion_congrats_enabled: number;
};

function parsePreferences(
  raw: RawNotificationPreferences
): LocalNotificationPreferences {
  return {
    ...raw,
    evening_nudge_enabled: raw.evening_nudge_enabled === 1,
    completion_congrats_enabled: raw.completion_congrats_enabled === 1,
  };
}

export function getNotificationPreferences(
  db: SQLite.SQLiteDatabase
): LocalNotificationPreferences | null {
  const raw = db.getFirstSync<RawNotificationPreferences>(
    "SELECT * FROM notification_preferences LIMIT 1"
  );
  if (!raw) return null;
  return parsePreferences(raw);
}

export type NotificationPreferencesData = Partial<
  Omit<LocalNotificationPreferences, "id" | "created_at" | "updated_at">
>;

export function createOrUpdateNotificationPreferences(
  db: SQLite.SQLiteDatabase,
  data: NotificationPreferencesData
): LocalNotificationPreferences {
  const existing = db.getFirstSync<RawNotificationPreferences>(
    "SELECT * FROM notification_preferences LIMIT 1"
  );

  if (existing) {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.daily_reminder_time !== undefined) {
      fields.push("daily_reminder_time = ?");
      values.push(data.daily_reminder_time);
    }
    if (data.evening_nudge_enabled !== undefined) {
      fields.push("evening_nudge_enabled = ?");
      values.push(data.evening_nudge_enabled ? 1 : 0);
    }
    if (data.evening_nudge_time !== undefined) {
      fields.push("evening_nudge_time = ?");
      values.push(data.evening_nudge_time);
    }
    if (data.completion_congrats_enabled !== undefined) {
      fields.push("completion_congrats_enabled = ?");
      values.push(data.completion_congrats_enabled ? 1 : 0);
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(existing.id);
      db.runSync(
        `UPDATE notification_preferences SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }

    const updated = db.getFirstSync<RawNotificationPreferences>(
      "SELECT * FROM notification_preferences WHERE id = ?",
      [existing.id]
    );

    if (!updated) {
      throw new Error("Failed to update notification preferences");
    }

    return parsePreferences(updated);
  }

  const id = crypto.randomUUID();
  db.runSync(
    `INSERT INTO notification_preferences
      (id, daily_reminder_time, evening_nudge_enabled, evening_nudge_time,
       completion_congrats_enabled)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      data.daily_reminder_time ?? "08:00",
      data.evening_nudge_enabled ? 1 : 0,
      data.evening_nudge_time ?? "20:00",
      data.completion_congrats_enabled !== false ? 1 : 0,
    ]
  );

  const created = db.getFirstSync<RawNotificationPreferences>(
    "SELECT * FROM notification_preferences WHERE id = ?",
    [id]
  );

  if (!created) {
    throw new Error("Failed to create notification preferences");
  }

  return parsePreferences(created);
}
