import type { SQLiteDatabase } from "expo-sqlite";
import type { Content } from "../../types";

interface RawContent {
  id: string;
  type: string;
  title: string;
  body: string;
  trigger_condition: string | null;
  phase: string | null;
  sort_order: number;
}

function parseTriggerCondition(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseRawContent(raw: RawContent): Content {
  return {
    id: raw.id,
    type: raw.type as Content["type"],
    title: raw.title,
    body: raw.body,
    trigger_condition: parseTriggerCondition(raw.trigger_condition),
    phase: raw.phase as Content["phase"],
    sort_order: raw.sort_order,
  };
}

export function getAllContent(db: SQLiteDatabase, type?: string): Content[] {
  const rows = type
    ? db.getAllSync<RawContent>(
        "SELECT * FROM content WHERE type = ? ORDER BY sort_order ASC",
        [type]
      )
    : db.getAllSync<RawContent>("SELECT * FROM content ORDER BY sort_order ASC");
  return rows.map(parseRawContent);
}
