import { eq, asc, sql } from "drizzle-orm";
import { db } from "../database-context";
import { exercises } from "../schema";
import type {
  Exercise,
  ExercisePhase,
  ExerciseMuscleGroup,
  ExerciseRole,
  ExerciseCategory,
} from "../../types";

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

export async function getAllExercises(): Promise<Exercise[]> {
  const rows = await db.select().from(exercises).orderBy(asc(exercises.sort_order));
  return rows.map(rowToExercise);
}

// Phase order used for range comparisons in SQLite CASE expressions.
// SQLite stores phases as TEXT, but the enum values don't sort alphabetically
// in phase order, so we map each value to a numeric index for comparison.
export async function getExercisesByPhase(phase: ExercisePhase): Promise<Exercise[]> {
  const rows = await db
    .select()
    .from(exercises)
    .where(
      sql`
        (CASE exercises.phase_start
          WHEN 'prehab' THEN 1
          WHEN 'acute' THEN 2
          WHEN 'early_active' THEN 3
          WHEN 'strengthening' THEN 4
          WHEN 'advanced_strengthening' THEN 5
          WHEN 'return_to_sport' THEN 6
          ELSE 0
        END) <= (CASE ${phase}
          WHEN 'prehab' THEN 1
          WHEN 'acute' THEN 2
          WHEN 'early_active' THEN 3
          WHEN 'strengthening' THEN 4
          WHEN 'advanced_strengthening' THEN 5
          WHEN 'return_to_sport' THEN 6
          ELSE 0
        END)
        AND (
          exercises.phase_end IS NULL
          OR (CASE exercises.phase_end
            WHEN 'prehab' THEN 1
            WHEN 'acute' THEN 2
            WHEN 'early_active' THEN 3
            WHEN 'strengthening' THEN 4
            WHEN 'advanced_strengthening' THEN 5
            WHEN 'return_to_sport' THEN 6
            ELSE 99
          END) >= (CASE ${phase}
            WHEN 'prehab' THEN 1
            WHEN 'acute' THEN 2
            WHEN 'early_active' THEN 3
            WHEN 'strengthening' THEN 4
            WHEN 'advanced_strengthening' THEN 5
            WHEN 'return_to_sport' THEN 6
            ELSE 0
          END)
        )
      `
    )
    .orderBy(asc(exercises.sort_order));
  return rows.map(rowToExercise);
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const rows = await db.select().from(exercises).where(eq(exercises.id, id));
  if (rows.length === 0) return null;
  return rowToExercise(rows[0]);
}

export type SeedExerciseData = Omit<Exercise, "submitted_by" | "status">;

export async function seedExercises(exerciseList: SeedExerciseData[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const ex of exerciseList) {
      await tx
        .insert(exercises)
        .values({
          id: ex.id,
          name: ex.name,
          description: ex.description,
          phase_start: ex.phase_start,
          phase_end: ex.phase_end ?? null,
          role: ex.role,
          primary_exercise_id: ex.primary_exercise_id ?? null,
          muscle_groups: JSON.stringify(ex.muscle_groups),
          default_sets: ex.default_sets,
          default_reps: ex.default_reps,
          default_hold_seconds: ex.default_hold_seconds ?? null,
          category: ex.category,
          sort_order: ex.sort_order,
        })
        .onConflictDoNothing();
    }
  });
}

export async function updateExerciseCatalog(
  exerciseList: SeedExerciseData[],
  version: number
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const ex of exerciseList) {
      await tx
        .insert(exercises)
        .values({
          id: ex.id,
          name: ex.name,
          description: ex.description,
          phase_start: ex.phase_start,
          phase_end: ex.phase_end ?? null,
          role: ex.role,
          primary_exercise_id: ex.primary_exercise_id ?? null,
          muscle_groups: JSON.stringify(ex.muscle_groups),
          default_sets: ex.default_sets,
          default_reps: ex.default_reps,
          default_hold_seconds: ex.default_hold_seconds ?? null,
          category: ex.category,
          sort_order: ex.sort_order,
          catalog_version: version,
        })
        .onConflictDoUpdate({
          target: exercises.id,
          set: {
            name: ex.name,
            description: ex.description,
            phase_start: ex.phase_start,
            phase_end: ex.phase_end ?? null,
            role: ex.role,
            primary_exercise_id: ex.primary_exercise_id ?? null,
            muscle_groups: JSON.stringify(ex.muscle_groups),
            default_sets: ex.default_sets,
            default_reps: ex.default_reps,
            default_hold_seconds: ex.default_hold_seconds ?? null,
            category: ex.category,
            sort_order: ex.sort_order,
            catalog_version: version,
            updated_at: sql`(datetime('now'))`,
          },
        });
    }
  });
}
