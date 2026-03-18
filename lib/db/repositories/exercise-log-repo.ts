import * as SQLite from "expo-sqlite";

export interface LocalExerciseLog {
  id: string;
  daily_log_id: string;
  user_exercise_id: string;
  completed: boolean;
  actual_sets: number;
  actual_reps: number;
  created_at: string;
  updated_at: string;
}

type RawExerciseLog = Omit<LocalExerciseLog, "completed"> & {
  completed: number;
};

function parseExerciseLog(raw: RawExerciseLog): LocalExerciseLog {
  return {
    ...raw,
    completed: raw.completed === 1,
  };
}

export function getExerciseLogsByDailyLogId(
  db: SQLite.SQLiteDatabase,
  dailyLogId: string
): LocalExerciseLog[] {
  const rows = db.getAllSync<RawExerciseLog>(
    "SELECT * FROM exercise_logs WHERE daily_log_id = ? ORDER BY created_at ASC",
    [dailyLogId]
  );
  return rows.map(parseExerciseLog);
}

export type UpsertExerciseLogData = {
  id: string;
  daily_log_id: string;
  user_exercise_id: string;
  completed: boolean;
  actual_sets: number;
  actual_reps: number;
};

export function upsertExerciseLog(
  db: SQLite.SQLiteDatabase,
  data: UpsertExerciseLogData
): LocalExerciseLog {
  db.runSync(
    `INSERT INTO exercise_logs
      (id, daily_log_id, user_exercise_id, completed, actual_sets, actual_reps)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(daily_log_id, user_exercise_id) DO UPDATE SET
       completed = excluded.completed,
       actual_sets = excluded.actual_sets,
       actual_reps = excluded.actual_reps,
       updated_at = datetime('now')`,
    [
      data.id,
      data.daily_log_id,
      data.user_exercise_id,
      data.completed ? 1 : 0,
      data.actual_sets,
      data.actual_reps,
    ]
  );

  const row = db.getFirstSync<RawExerciseLog>(
    "SELECT * FROM exercise_logs WHERE daily_log_id = ? AND user_exercise_id = ?",
    [data.daily_log_id, data.user_exercise_id]
  );

  if (!row) {
    throw new Error("Failed to upsert exercise log");
  }

  return parseExerciseLog(row);
}
