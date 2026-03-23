import { eq, and, gte, lte, asc, sql } from "drizzle-orm";
import { db } from "../database-context";
import { daily_logs } from "../schema";
import { generateId } from "../../utils/uuid";

export interface LocalDailyLog {
  id: string;
  date: string;
  is_rest_day: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToLocalDailyLog(row: typeof daily_logs.$inferSelect): LocalDailyLog {
  return {
    id: row.id,
    date: row.date,
    is_rest_day: row.is_rest_day === 1,
    notes: row.notes ?? null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getOrCreateDailyLog(date: string): Promise<LocalDailyLog> {
  const existing = await db
    .select()
    .from(daily_logs)
    .where(eq(daily_logs.date, date));

  if (existing.length > 0) {
    return rowToLocalDailyLog(existing[0]);
  }

  const id = generateId();
  await db.insert(daily_logs).values({
    id,
    date,
    is_rest_day: 0,
    notes: null,
  }).onConflictDoNothing();

  const created = await db
    .select()
    .from(daily_logs)
    .where(eq(daily_logs.date, date));

  if (created.length === 0) {
    throw new Error(`Failed to create daily log for date ${date}`);
  }

  return rowToLocalDailyLog(created[0]);
}

export async function getDailyLogsByDateRange(
  startDate: string,
  endDate: string
): Promise<LocalDailyLog[]> {
  const rows = await db
    .select()
    .from(daily_logs)
    .where(and(gte(daily_logs.date, startDate), lte(daily_logs.date, endDate)))
    .orderBy(asc(daily_logs.date));
  return rows.map(rowToLocalDailyLog);
}

export type UpdateDailyLogData = Partial<
  Pick<LocalDailyLog, "is_rest_day" | "notes">
>;

export async function updateDailyLog(
  id: string,
  data: UpdateDailyLogData
): Promise<LocalDailyLog> {
  const updates: Partial<typeof daily_logs.$inferInsert> = {};

  if (data.is_rest_day !== undefined) updates.is_rest_day = data.is_rest_day ? 1 : 0;
  if (data.notes !== undefined) updates.notes = data.notes ?? null;

  if (Object.keys(updates).length > 0) {
    updates.updated_at = sql`(datetime('now'))` as unknown as string;
    await db.update(daily_logs).set(updates).where(eq(daily_logs.id, id));
  }

  const rows = await db
    .select()
    .from(daily_logs)
    .where(eq(daily_logs.id, id));

  if (rows.length === 0) {
    throw new Error(`Daily log not found: ${id}`);
  }

  return rowToLocalDailyLog(rows[0]);
}
