import { eq, and, gte, lte, asc, desc } from "drizzle-orm";
import { db } from "../database-context";
import { daily_logs } from "../schema";
import { generateId } from "../../utils/uuid";
import type { DailyLog, UpdateDailyLogData } from "../../data/data-store.types";

function rowToDailyLog(row: typeof daily_logs.$inferSelect): DailyLog {
  return {
    id: row.id,
    date: row.date,
    is_rest_day: row.is_rest_day === 1,
    is_pt_day: row.is_pt_day === 1,
    notes: row.notes ?? null,
    created_at: row.created_at ?? "",
  };
}

export async function getOrCreateDailyLog(date: string): Promise<DailyLog> {
  const existing = await db
    .select()
    .from(daily_logs)
    .where(eq(daily_logs.date, date));

  if (existing.length > 0) {
    return rowToDailyLog(existing[0]);
  }

  const id = generateId();
  await db.insert(daily_logs).values({
    id,
    date,
    is_rest_day: 0,
    is_pt_day: 0,
    notes: null,
  }).onConflictDoNothing();

  const created = await db
    .select()
    .from(daily_logs)
    .where(eq(daily_logs.date, date));

  if (created.length === 0) {
    throw new Error(`Failed to create daily log for date ${date}`);
  }

  return rowToDailyLog(created[0]);
}

export async function getDailyLogsByDateRange(
  startDate: string,
  endDate: string
): Promise<DailyLog[]> {
  const rows = await db
    .select()
    .from(daily_logs)
    .where(and(gte(daily_logs.date, startDate), lte(daily_logs.date, endDate)))
    .orderBy(asc(daily_logs.date));
  return rows.map(rowToDailyLog);
}

export async function updateDailyLog(
  id: string,
  data: UpdateDailyLogData
): Promise<DailyLog> {
  const updates: Partial<typeof daily_logs.$inferInsert> = {};

  if (data.is_rest_day !== undefined) updates.is_rest_day = data.is_rest_day ? 1 : 0;
  if (data.is_pt_day !== undefined) updates.is_pt_day = data.is_pt_day ? 1 : 0;
  if (data.notes !== undefined) updates.notes = data.notes ?? null;

  if (Object.keys(updates).length > 0) {
    await db.update(daily_logs).set(updates).where(eq(daily_logs.id, id));
  }

  const rows = await db
    .select()
    .from(daily_logs)
    .where(eq(daily_logs.id, id));

  if (rows.length === 0) {
    throw new Error(`Daily log not found: ${id}`);
  }

  return rowToDailyLog(rows[0]);
}

export async function getDailyLogsForStreak(): Promise<{ date: string; is_rest_day: boolean }[]> {
  const rows = await db
    .select({ date: daily_logs.date, is_rest_day: daily_logs.is_rest_day })
    .from(daily_logs)
    .orderBy(desc(daily_logs.date))
    .limit(60);
  return rows.map((r) => ({ date: r.date, is_rest_day: r.is_rest_day === 1 }));
}
