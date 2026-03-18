import * as SQLite from "expo-sqlite";

export interface LocalUserAchievement {
  id: string;
  content_id: string;
  unlocked_at: string;
  created_at: string;
  updated_at: string;
}

export function getUnlockedAchievements(
  db: SQLite.SQLiteDatabase
): LocalUserAchievement[] {
  return db.getAllSync<LocalUserAchievement>(
    "SELECT * FROM user_achievements ORDER BY unlocked_at DESC"
  );
}

export function unlockAchievement(
  db: SQLite.SQLiteDatabase,
  contentId: string
): LocalUserAchievement {
  const existing = db.getFirstSync<LocalUserAchievement>(
    "SELECT * FROM user_achievements WHERE content_id = ?",
    [contentId]
  );

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  const unlockedAt = new Date().toISOString();

  db.runSync(
    "INSERT INTO user_achievements (id, content_id, unlocked_at) VALUES (?, ?, ?)",
    [id, contentId, unlockedAt]
  );

  const created = db.getFirstSync<LocalUserAchievement>(
    "SELECT * FROM user_achievements WHERE id = ?",
    [id]
  );

  if (!created) {
    throw new Error("Failed to unlock achievement");
  }

  return created;
}
