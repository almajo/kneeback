import * as SQLite from "expo-sqlite";
import type { Exercise, Content } from "../types";
import exercisesJson from "./seed/exercises.json";
import contentJson from "./seed/content.json";

type SeedExercise = Omit<Exercise, "submitted_by" | "status">;
type SeedContent = Content;

const seedExercises: SeedExercise[] = exercisesJson as SeedExercise[];
const seedContent: SeedContent[] = contentJson as SeedContent[];

function insertExercise(db: SQLite.SQLiteDatabase, ex: SeedExercise): void {
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

function insertContent(db: SQLite.SQLiteDatabase, c: SeedContent): void {
  db.runSync(
    `INSERT OR IGNORE INTO content
      (id, type, title, body, trigger_condition, phase, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      c.id,
      c.type,
      c.title,
      c.body,
      c.trigger_condition !== null ? JSON.stringify(c.trigger_condition) : null,
      c.phase ?? null,
      c.sort_order,
    ]
  );
}

export function seedDatabase(db: SQLite.SQLiteDatabase): void {
  const exerciseCount = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM exercises"
  );

  if (!exerciseCount || exerciseCount.count === 0) {
    db.withTransactionSync(() => {
      for (const exercise of seedExercises) {
        insertExercise(db, exercise);
      }
    });
  }

  const contentCount = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM content"
  );

  if (!contentCount || contentCount.count === 0) {
    db.withTransactionSync(() => {
      for (const item of seedContent) {
        insertContent(db, item);
      }
    });
  }
}
