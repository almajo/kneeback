import * as SQLite from "expo-sqlite";
import { generateId } from "../../utils/uuid";

export interface LocalDailyLog {
  id: string;
  date: string;
  is_rest_day: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type RawDailyLog = Omit<LocalDailyLog, "is_rest_day"> & {
  is_rest_day: number;
};

function parseDailyLog(raw: RawDailyLog): LocalDailyLog {
  return {
    ...raw,
    is_rest_day: raw.is_rest_day === 1,
  };
}

export function getOrCreateDailyLog(
  db: SQLite.SQLiteDatabase,
  date: string
): LocalDailyLog {
  const existing = db.getFirstSync<RawDailyLog>(
    "SELECT * FROM daily_logs WHERE date = ?",
    [date]
  );

  if (existing) {
    return parseDailyLog(existing);
  }

  const id = generateId();
  db.runSync(
    "INSERT INTO daily_logs (id, date, is_rest_day, notes) VALUES (?, ?, 0, NULL)",
    [id, date]
  );

  const created = db.getFirstSync<RawDailyLog>(
    "SELECT * FROM daily_logs WHERE id = ?",
    [id]
  );

  if (!created) {
    throw new Error(`Failed to create daily log for date ${date}`);
  }

  return parseDailyLog(created);
}

export function getDailyLogsByDateRange(
  db: SQLite.SQLiteDatabase,
  startDate: string,
  endDate: string
): LocalDailyLog[] {
  const rows = db.getAllSync<RawDailyLog>(
    "SELECT * FROM daily_logs WHERE date >= ? AND date <= ? ORDER BY date ASC",
    [startDate, endDate]
  );
  return rows.map(parseDailyLog);
}

export type UpdateDailyLogData = Partial<
  Pick<LocalDailyLog, "is_rest_day" | "notes">
>;

export function updateDailyLog(
  db: SQLite.SQLiteDatabase,
  id: string,
  data: UpdateDailyLogData
): LocalDailyLog {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.is_rest_day !== undefined) {
    fields.push("is_rest_day = ?");
    values.push(data.is_rest_day ? 1 : 0);
  }
  if (data.notes !== undefined) {
    fields.push("notes = ?");
    values.push(data.notes ?? null);
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.runSync(
      `UPDATE daily_logs SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }

  const updated = db.getFirstSync<RawDailyLog>(
    "SELECT * FROM daily_logs WHERE id = ?",
    [id]
  );

  if (!updated) {
    throw new Error(`Daily log not found: ${id}`);
  }

  return parseDailyLog(updated);
}
