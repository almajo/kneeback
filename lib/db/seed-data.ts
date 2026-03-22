import { sql } from "drizzle-orm";
import { db } from "./database-context";
import { exercises, content } from "./schema";
import type { Exercise, Content } from "../types";
import exercisesJson from "./seed/exercises.json";
import contentJson from "./seed/content.json";

type SeedExercise = Omit<Exercise, "submitted_by" | "status">;
type SeedContent = Content;

const seedExercises: SeedExercise[] = exercisesJson as SeedExercise[];
const seedContent: SeedContent[] = contentJson as SeedContent[];

export async function seedDatabase(): Promise<void> {
  const [exerciseCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(exercises);

  if (!exerciseCountRow || exerciseCountRow.count === 0) {
    await db.transaction(async (tx) => {
      for (const ex of seedExercises) {
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

  const [contentCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(content);

  if (!contentCountRow || contentCountRow.count === 0) {
    await db.transaction(async (tx) => {
      for (const item of seedContent) {
        await tx
          .insert(content)
          .values({
            id: item.id,
            type: item.type,
            title: item.title,
            body: item.body,
            trigger_condition:
              item.trigger_condition !== null
                ? JSON.stringify(item.trigger_condition)
                : null,
            phase: item.phase ?? null,
            sort_order: item.sort_order,
          })
          .onConflictDoNothing();
      }
    });
  }
}
