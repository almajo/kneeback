import { eq, asc } from "drizzle-orm";
import { db } from "../database-context";
import { content } from "../schema";
import type { Content } from "../../types";

function parseTriggerCondition(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseRawContent(row: typeof content.$inferSelect): Content {
  return {
    id: row.id,
    type: row.type as Content["type"],
    title: row.title,
    body: row.body,
    trigger_condition: parseTriggerCondition(row.trigger_condition ?? null),
    phase: row.phase as Content["phase"],
    sort_order: row.sort_order,
  };
}

export async function getAllContent(type?: string): Promise<Content[]> {
  const rows = type
    ? await db
        .select()
        .from(content)
        .where(eq(content.type, type))
        .orderBy(asc(content.sort_order))
    : await db.select().from(content).orderBy(asc(content.sort_order));
  return rows.map(parseRawContent);
}
