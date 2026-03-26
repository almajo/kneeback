import { eq, asc, sql } from "drizzle-orm";
import { db } from "../database-context";
import { user_exercises, exercises } from "../schema";
import type { Exercise, ExerciseMuscleGroup, ExercisePhase, ExerciseRole, ExerciseCategory } from "../../types";

export interface LocalUserExercise {
  id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  hold_seconds: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  exercise?: Exercise;
}

function rowToExercise(row: typeof exercises.$inferSelect): Exercise {
  let muscleGroups: ExerciseMuscleGroup[] = [];
  try {
    muscleGroups = JSON.parse(row.muscle_groups) as ExerciseMuscleGroup[];
  } catch {
    muscleGroups = [];
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    phase_start: row.phase_start as ExercisePhase,
    phase_end: (row.phase_end as ExercisePhase) ?? null,
    role: row.role as ExerciseRole,
    primary_exercise_id: row.primary_exercise_id ?? null,
    muscle_groups: muscleGroups,
    default_sets: row.default_sets,
    default_reps: row.default_reps,
    default_hold_seconds: row.default_hold_seconds ?? null,
    category: row.category as ExerciseCategory,
    submitted_by: null,
    status: "approved",
    sort_order: row.sort_order,
  };
}

function rowToLocalUserExercise(
  ue: typeof user_exercises.$inferSelect,
  ex: typeof exercises.$inferSelect | null
): LocalUserExercise {
  return {
    id: ue.id,
    exercise_id: ue.exercise_id,
    sets: ue.sets,
    reps: ue.reps,
    hold_seconds: ue.hold_seconds ?? null,
    sort_order: ue.sort_order,
    created_at: ue.created_at ?? "",
    updated_at: ue.updated_at ?? "",
    exercise: ex ? rowToExercise(ex) : undefined,
  };
}

export async function getAllUserExercises(): Promise<LocalUserExercise[]> {
  const rows = await db
    .select()
    .from(user_exercises)
    .leftJoin(exercises, eq(user_exercises.exercise_id, exercises.id))
    .orderBy(asc(user_exercises.sort_order));
  return rows.map((r) => rowToLocalUserExercise(r.user_exercises, r.exercises));
}

export type CreateUserExerciseData = Omit<
  LocalUserExercise,
  "created_at" | "updated_at" | "exercise"
>;

export async function createUserExercise(
  data: CreateUserExerciseData
): Promise<LocalUserExercise> {
  // Upsert on exercise_id — if the exercise is already in the plan, update it
  // rather than inserting a duplicate. The existing row's id is preserved so
  // exercise_logs FK references remain valid.
  await db.insert(user_exercises).values({
    id: data.id,
    exercise_id: data.exercise_id,
    sets: data.sets,
    reps: data.reps,
    hold_seconds: data.hold_seconds ?? null,
    sort_order: data.sort_order,
  }).onConflictDoUpdate({
    target: user_exercises.exercise_id,
    set: {
      sets: data.sets,
      reps: data.reps,
      hold_seconds: data.hold_seconds ?? null,
      sort_order: data.sort_order,
      updated_at: sql`(datetime('now'))`,
    },
  });

  // Query by exercise_id — the row id may differ from data.id if it already existed
  const rows = await db
    .select()
    .from(user_exercises)
    .leftJoin(exercises, eq(user_exercises.exercise_id, exercises.id))
    .where(eq(user_exercises.exercise_id, data.exercise_id));

  if (rows.length === 0) {
    throw new Error("Failed to create user exercise");
  }
  return rowToLocalUserExercise(rows[0].user_exercises, rows[0].exercises);
}

export type UpdateUserExerciseData = Partial<
  Omit<CreateUserExerciseData, "id" | "exercise_id">
>;

export async function updateUserExercise(
  id: string,
  data: UpdateUserExerciseData
): Promise<LocalUserExercise> {
  const updates: Partial<typeof user_exercises.$inferInsert> = {};

  if (data.sets !== undefined) updates.sets = data.sets;
  if (data.reps !== undefined) updates.reps = data.reps;
  if (data.hold_seconds !== undefined) updates.hold_seconds = data.hold_seconds ?? null;
  if (data.sort_order !== undefined) updates.sort_order = data.sort_order;

  if (Object.keys(updates).length > 0) {
    updates.updated_at = sql`(datetime('now'))` as unknown as string;
    await db.update(user_exercises).set(updates).where(eq(user_exercises.id, id));
  }

  const rows = await db
    .select()
    .from(user_exercises)
    .leftJoin(exercises, eq(user_exercises.exercise_id, exercises.id))
    .where(eq(user_exercises.id, id));

  if (rows.length === 0) {
    throw new Error(`User exercise not found: ${id}`);
  }
  return rowToLocalUserExercise(rows[0].user_exercises, rows[0].exercises);
}

export async function updateUserExerciseSortOrder(
  id: string,
  sortOrder: number
): Promise<void> {
  const result = await db
    .update(user_exercises)
    .set({ sort_order: sortOrder, updated_at: sql`(datetime('now'))` as unknown as string })
    .where(eq(user_exercises.id, id));
  if (result.changes === 0) {
    throw new Error(`UserExercise not found: ${id}`);
  }
}

export async function deleteUserExercise(id: string): Promise<void> {
  const result = await db
    .delete(user_exercises)
    .where(eq(user_exercises.id, id));
  if (result.changes === 0) {
    throw new Error(`UserExercise not found: ${id}`);
  }
}
