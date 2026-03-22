import { eq, desc, asc, sql } from "drizzle-orm";
import { db } from "../database-context";
import { milestones } from "../schema";

export interface LocalMilestone {
  id: string;
  title: string;
  category: "milestone" | "win";
  date: string;
  notes: string | null;
  template_key: string | null;
  created_at: string;
  updated_at: string;
}

function rowToLocalMilestone(row: typeof milestones.$inferSelect): LocalMilestone {
  return {
    id: row.id,
    title: row.title,
    category: row.category as "milestone" | "win",
    date: row.date,
    notes: row.notes ?? null,
    template_key: row.template_key ?? null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getAllMilestones(): Promise<LocalMilestone[]> {
  const rows = await db
    .select()
    .from(milestones)
    .orderBy(desc(milestones.date), desc(milestones.created_at));
  return rows.map(rowToLocalMilestone);
}

export async function getMilestonesByDate(date: string): Promise<LocalMilestone[]> {
  const rows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.date, date))
    .orderBy(asc(milestones.created_at));
  return rows.map(rowToLocalMilestone);
}

export type CreateMilestoneData = Omit<
  LocalMilestone,
  "created_at" | "updated_at"
>;

export async function createMilestone(
  data: CreateMilestoneData
): Promise<LocalMilestone> {
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

  return rowToLocalMilestone(rows[0]);
}

export async function deleteMilestone(id: string): Promise<void> {
  await db.delete(milestones).where(eq(milestones.id, id));
}
