import { eq, and, asc, sql } from "drizzle-orm";
import { db } from "../database-context";
import { exercise_logs } from "../schema";

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

function rowToLocalExerciseLog(row: typeof exercise_logs.$inferSelect): LocalExerciseLog {
  return {
    id: row.id,
    daily_log_id: row.daily_log_id,
    user_exercise_id: row.user_exercise_id,
    completed: row.completed === 1,
    actual_sets: row.actual_sets,
    actual_reps: row.actual_reps,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getExerciseLogsByDailyLogId(
  dailyLogId: string
): Promise<LocalExerciseLog[]> {
  const rows = await db
    .select()
    .from(exercise_logs)
    .where(eq(exercise_logs.daily_log_id, dailyLogId))
    .orderBy(asc(exercise_logs.created_at));
  return rows.map(rowToLocalExerciseLog);
}

export async function getExerciseLogsByDailyLogIds(
  dailyLogIds: string[]
): Promise<LocalExerciseLog[]> {
  if (dailyLogIds.length === 0) return [];
  const placeholders = dailyLogIds.map(() => "?").join(",");
  const rows = await db.$client.getAllAsync<typeof exercise_logs.$inferSelect>(
    `SELECT * FROM exercise_logs WHERE daily_log_id IN (${placeholders})`,
    dailyLogIds
  );
  return rows.map(rowToLocalExerciseLog);
}

export type UpsertExerciseLogData = {
  id: string;
  daily_log_id: string;
  user_exercise_id: string;
  completed: boolean;
  actual_sets: number;
  actual_reps: number;
};

export async function upsertExerciseLog(
  data: UpsertExerciseLogData
): Promise<LocalExerciseLog> {
  await db
    .insert(exercise_logs)
    .values({
      id: data.id,
      daily_log_id: data.daily_log_id,
      user_exercise_id: data.user_exercise_id,
      completed: data.completed ? 1 : 0,
      actual_sets: data.actual_sets,
      actual_reps: data.actual_reps,
    })
    .onConflictDoUpdate({
      target: [exercise_logs.daily_log_id, exercise_logs.user_exercise_id],
      set: {
        completed: data.completed ? 1 : 0,
        actual_sets: data.actual_sets,
        actual_reps: data.actual_reps,
        updated_at: sql`(datetime('now'))`,
      },
    });

  const rows = await db
    .select()
    .from(exercise_logs)
    .where(
      and(
        eq(exercise_logs.daily_log_id, data.daily_log_id),
        eq(exercise_logs.user_exercise_id, data.user_exercise_id)
      )
    );

  if (rows.length === 0) {
    throw new Error("Failed to upsert exercise log");
  }

  return rowToLocalExerciseLog(rows[0]);
}
