import { eq, desc, asc } from "drizzle-orm";
import { db } from "../database-context";
import { milestones } from "../schema";
import type { Milestone, CreateMilestoneData } from "../../data/data-store.types";

function rowToMilestone(row: typeof milestones.$inferSelect): Milestone {
  return {
    id: row.id,
    title: row.title,
    category: row.category as "milestone" | "win",
    date: row.date,
    notes: row.notes ?? null,
    template_key: row.template_key ?? null,
    created_at: row.created_at ?? "",
  };
}

export async function getAllMilestones(): Promise<Milestone[]> {
  const rows = await db
    .select()
    .from(milestones)
    .orderBy(desc(milestones.date), desc(milestones.created_at));
  return rows.map(rowToMilestone);
}

export async function getMilestonesByDate(date: string): Promise<Milestone[]> {
  const rows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.date, date))
    .orderBy(asc(milestones.created_at));
  return rows.map(rowToMilestone);
}

export async function createMilestone(
  data: CreateMilestoneData
): Promise<Milestone> {
  await db.insert(milestones).values({
    id: data.id,
    title: data.title,
    category: data.category,
    date: data.date,
    notes: data.notes ?? null,
    template_key: data.template_key ?? null,
  });

  const rows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, data.id));

  if (rows.length === 0) {
    throw new Error("Failed to create milestone");
  }

  return rowToMilestone(rows[0]);
}

export async function deleteMilestone(id: string): Promise<void> {
  await db.delete(milestones).where(eq(milestones.id, id));
}
