import { eq, and, asc } from "drizzle-orm";
import { db } from "../database-context";
import { exercise_logs } from "../schema";
import type { ExerciseLog, UpsertExerciseLogData } from "../../data/data-store.types";

function rowToExerciseLog(row: typeof exercise_logs.$inferSelect): ExerciseLog {
  return {
    id: row.id,
    daily_log_id: row.daily_log_id,
    user_exercise_id: row.user_exercise_id,
    completed: row.completed === 1,
    actual_sets: row.actual_sets,
    actual_reps: row.actual_reps,
  };
}

export async function getExerciseLogsByDailyLogId(
  dailyLogId: string
): Promise<ExerciseLog[]> {
  const rows = await db
    .select()
    .from(exercise_logs)
    .where(eq(exercise_logs.daily_log_id, dailyLogId))
    .orderBy(asc(exercise_logs.id));
  return rows.map(rowToExerciseLog);
}

export async function getExerciseLogsByDailyLogIds(
  dailyLogIds: string[]
): Promise<ExerciseLog[]> {
  if (dailyLogIds.length === 0) return [];
  const placeholders = dailyLogIds.map(() => "?").join(",");
  const rows = await db.$client.getAllAsync<typeof exercise_logs.$inferSelect>(
    `SELECT * FROM exercise_logs WHERE daily_log_id IN (${placeholders})`,
    dailyLogIds
  );
  return rows.map(rowToExerciseLog);
}

export async function upsertExerciseLog(
  data: UpsertExerciseLogData
): Promise<ExerciseLog> {
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

  return rowToExerciseLog(rows[0]);
}
