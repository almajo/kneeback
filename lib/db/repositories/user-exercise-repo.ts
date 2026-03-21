import * as SQLite from "expo-sqlite";
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

type RawUserExercise = {
  id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  hold_seconds: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type RawJoinedRow = RawUserExercise & {
  ex_id: string;
  ex_name: string;
  ex_description: string;
  ex_phase_start: string;
  ex_phase_end: string | null;
  ex_role: string;
  ex_primary_exercise_id: string | null;
  ex_muscle_groups: string;
  ex_default_sets: number;
  ex_default_reps: number;
  ex_default_hold_seconds: number | null;
  ex_category: string;
  ex_sort_order: number;
};

function parseExerciseFromJoin(row: RawJoinedRow): Exercise {
  let muscleGroups: ExerciseMuscleGroup[] = [];
  try {
    muscleGroups = JSON.parse(row.ex_muscle_groups) as ExerciseMuscleGroup[];
  } catch {
    muscleGroups = [];
  }

  return {
    id: row.ex_id,
    name: row.ex_name,
    description: row.ex_description,
    phase_start: row.ex_phase_start as ExercisePhase,
    phase_end: row.ex_phase_end as ExercisePhase | null,
    role: row.ex_role as ExerciseRole,
    primary_exercise_id: row.ex_primary_exercise_id,
    muscle_groups: muscleGroups,
    default_sets: row.ex_default_sets,
    default_reps: row.ex_default_reps,
    default_hold_seconds: row.ex_default_hold_seconds,
    category: row.ex_category as ExerciseCategory,
    submitted_by: null,
    status: "approved",
    sort_order: row.ex_sort_order,
  };
}

function parseUserExercise(raw: RawUserExercise): LocalUserExercise {
  return { ...raw };
}

function parseJoinedUserExercise(row: RawJoinedRow): LocalUserExercise {
  return {
    id: row.id,
    exercise_id: row.exercise_id,
    sets: row.sets,
    reps: row.reps,
    hold_seconds: row.hold_seconds,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    exercise: parseExerciseFromJoin(row),
  };
}

const JOIN_QUERY = `
  SELECT
    ue.id, ue.exercise_id, ue.sets, ue.reps, ue.hold_seconds,
    ue.sort_order, ue.created_at, ue.updated_at,
    e.id as ex_id, e.name as ex_name, e.description as ex_description,
    e.phase_start as ex_phase_start, e.phase_end as ex_phase_end,
    e.role as ex_role, e.primary_exercise_id as ex_primary_exercise_id,
    e.muscle_groups as ex_muscle_groups,
    e.default_sets as ex_default_sets, e.default_reps as ex_default_reps,
    e.default_hold_seconds as ex_default_hold_seconds,
    e.category as ex_category, e.sort_order as ex_sort_order
  FROM user_exercises ue
  LEFT JOIN exercises e ON ue.exercise_id = e.id
`;

export function getAllUserExercises(
  db: SQLite.SQLiteDatabase
): LocalUserExercise[] {
  const rows = db.getAllSync<RawJoinedRow>(
    `${JOIN_QUERY} ORDER BY ue.sort_order ASC`
  );
  return rows.map(parseJoinedUserExercise);
}

export type CreateUserExerciseData = Omit<
  LocalUserExercise,
  "created_at" | "updated_at" | "exercise"
>;

export function createUserExercise(
  db: SQLite.SQLiteDatabase,
  data: CreateUserExerciseData
): LocalUserExercise {
  db.runSync(
    `INSERT INTO user_exercises
      (id, exercise_id, sets, reps, hold_seconds, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.exercise_id,
      data.sets,
      data.reps,
      data.hold_seconds ?? null,
      data.sort_order,
    ]
  );

  const row = db.getFirstSync<RawJoinedRow>(
    `${JOIN_QUERY} WHERE ue.id = ?`,
    [data.id]
  );

  if (!row) {
    throw new Error("Failed to create user exercise");
  }

  return parseJoinedUserExercise(row);
}

export type UpdateUserExerciseData = Partial<
  Omit<CreateUserExerciseData, "id" | "exercise_id">
>;

export function updateUserExercise(
  db: SQLite.SQLiteDatabase,
  id: string,
  data: UpdateUserExerciseData
): LocalUserExercise {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.sets !== undefined) {
    fields.push("sets = ?");
    values.push(data.sets);
  }
  if (data.reps !== undefined) {
    fields.push("reps = ?");
    values.push(data.reps);
  }
  if (data.hold_seconds !== undefined) {
    fields.push("hold_seconds = ?");
    values.push(data.hold_seconds ?? null);
  }
  if (data.sort_order !== undefined) {
    fields.push("sort_order = ?");
    values.push(data.sort_order);
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.runSync(
      `UPDATE user_exercises SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }

  const row = db.getFirstSync<RawJoinedRow>(
    `${JOIN_QUERY} WHERE ue.id = ?`,
    [id]
  );

  if (!row) {
    throw new Error(`User exercise not found: ${id}`);
  }

  return parseJoinedUserExercise(row);
}

export function updateUserExerciseSortOrder(
  db: SQLite.SQLiteDatabase,
  id: string,
  sortOrder: number
): void {
  const result = db.runSync(
    "UPDATE user_exercises SET sort_order = ?, updated_at = datetime('now') WHERE id = ?",
    [sortOrder, id]
  );
  if (result.changes === 0) {
    throw new Error(`UserExercise not found: ${id}`);
  }
}

export function deleteUserExercise(
  db: SQLite.SQLiteDatabase,
  id: string
): void {
  const result = db.runSync(
    "DELETE FROM user_exercises WHERE id = ?",
    [id]
  );
  if (result.changes === 0) {
    throw new Error(`UserExercise not found: ${id}`);
  }
}
