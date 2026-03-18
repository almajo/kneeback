import * as SQLite from "expo-sqlite";
import type {
  Exercise,
  ExercisePhase,
  ExerciseMuscleGroup,
  ExerciseRole,
  ExerciseCategory,
} from "../../types";

type RawExercise = Omit<Exercise, "muscle_groups" | "submitted_by" | "status"> & {
  muscle_groups: string;
  catalog_version: number;
};

function parseExercise(raw: RawExercise): Exercise {
  let muscleGroups: ExerciseMuscleGroup[] = [];
  try {
    muscleGroups = JSON.parse(raw.muscle_groups) as ExerciseMuscleGroup[];
  } catch {
    muscleGroups = [];
  }

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    phase_start: raw.phase_start as ExercisePhase,
    phase_end: raw.phase_end as ExercisePhase | null,
    role: raw.role as ExerciseRole,
    primary_exercise_id: raw.primary_exercise_id,
    muscle_groups: muscleGroups,
    default_sets: raw.default_sets,
    default_reps: raw.default_reps,
    default_hold_seconds: raw.default_hold_seconds,
    category: raw.category as ExerciseCategory,
    submitted_by: null,
    status: "approved",
    sort_order: raw.sort_order,
  };
}

export function getAllExercises(db: SQLite.SQLiteDatabase): Exercise[] {
  const rows = db.getAllSync<RawExercise>(
    "SELECT * FROM exercises ORDER BY sort_order ASC"
  );
  return rows.map(parseExercise);
}

// Phase order used for range comparisons in SQLite CASE expressions.
// SQLite stores phases as TEXT, but the enum values don't sort alphabetically
// in phase order, so we map each value to a numeric index for comparison.
const PHASE_CASE = `
  CASE ?
    WHEN 'prehab' THEN 1
    WHEN 'acute' THEN 2
    WHEN 'early_active' THEN 3
    WHEN 'strengthening' THEN 4
    WHEN 'advanced_strengthening' THEN 5
    WHEN 'return_to_sport' THEN 6
    ELSE 0
  END
`;

export function getExercisesByPhase(
  db: SQLite.SQLiteDatabase,
  phase: ExercisePhase
): Exercise[] {
  const rows = db.getAllSync<RawExercise>(
    `SELECT * FROM exercises
     WHERE (
       CASE phase_start
         WHEN 'prehab' THEN 1
         WHEN 'acute' THEN 2
         WHEN 'early_active' THEN 3
         WHEN 'strengthening' THEN 4
         WHEN 'advanced_strengthening' THEN 5
         WHEN 'return_to_sport' THEN 6
         ELSE 0
       END
     ) <= (${PHASE_CASE})
     AND (
       phase_end IS NULL
       OR (
         CASE phase_end
           WHEN 'prehab' THEN 1
           WHEN 'acute' THEN 2
           WHEN 'early_active' THEN 3
           WHEN 'strengthening' THEN 4
           WHEN 'advanced_strengthening' THEN 5
           WHEN 'return_to_sport' THEN 6
           ELSE 99
         END
       ) >= (${PHASE_CASE})
     )
     ORDER BY sort_order ASC`,
    [phase, phase]
  );
  return rows.map(parseExercise);
}

export function getExerciseById(
  db: SQLite.SQLiteDatabase,
  id: string
): Exercise | null {
  const raw = db.getFirstSync<RawExercise>(
    "SELECT * FROM exercises WHERE id = ?",
    [id]
  );
  if (!raw) return null;
  return parseExercise(raw);
}

export type SeedExerciseData = Omit<Exercise, "submitted_by" | "status">;

export function seedExercises(
  db: SQLite.SQLiteDatabase,
  exercises: SeedExerciseData[]
): void {
  for (const ex of exercises) {
    db.runSync(
      `INSERT OR IGNORE INTO exercises
        (id, name, description, phase_start, phase_end, role, primary_exercise_id,
         muscle_groups, default_sets, default_reps, default_hold_seconds, category, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ex.id,
        ex.name,
        ex.description,
        ex.phase_start,
        ex.phase_end ?? null,
        ex.role,
        ex.primary_exercise_id ?? null,
        JSON.stringify(ex.muscle_groups),
        ex.default_sets,
        ex.default_reps,
        ex.default_hold_seconds ?? null,
        ex.category,
        ex.sort_order,
      ]
    );
  }
}

export function updateExerciseCatalog(
  db: SQLite.SQLiteDatabase,
  exercises: SeedExerciseData[],
  version: number
): void {
  for (const ex of exercises) {
    db.runSync(
      `INSERT INTO exercises
        (id, name, description, phase_start, phase_end, role, primary_exercise_id,
         muscle_groups, default_sets, default_reps, default_hold_seconds, category,
         sort_order, catalog_version, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         phase_start = excluded.phase_start,
         phase_end = excluded.phase_end,
         role = excluded.role,
         primary_exercise_id = excluded.primary_exercise_id,
         muscle_groups = excluded.muscle_groups,
         default_sets = excluded.default_sets,
         default_reps = excluded.default_reps,
         default_hold_seconds = excluded.default_hold_seconds,
         category = excluded.category,
         sort_order = excluded.sort_order,
         catalog_version = excluded.catalog_version,
         updated_at = datetime('now')`,
      [
        ex.id,
        ex.name,
        ex.description,
        ex.phase_start,
        ex.phase_end ?? null,
        ex.role,
        ex.primary_exercise_id ?? null,
        JSON.stringify(ex.muscle_groups),
        ex.default_sets,
        ex.default_reps,
        ex.default_hold_seconds ?? null,
        ex.category,
        ex.sort_order,
        version,
      ]
    );
  }
}
