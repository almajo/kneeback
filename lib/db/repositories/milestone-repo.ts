import * as SQLite from "expo-sqlite";

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

type RawMilestone = Omit<LocalMilestone, "category"> & {
  category: string;
};

function parseMilestone(raw: RawMilestone): LocalMilestone {
  return {
    ...raw,
    category: raw.category as "milestone" | "win",
  };
}

export function getAllMilestones(
  db: SQLite.SQLiteDatabase
): LocalMilestone[] {
  const rows = db.getAllSync<RawMilestone>(
    "SELECT * FROM milestones ORDER BY date DESC, created_at DESC"
  );
  return rows.map(parseMilestone);
}

export function getMilestonesByDate(
  db: SQLite.SQLiteDatabase,
  date: string
): LocalMilestone[] {
  const rows = db.getAllSync<RawMilestone>(
    "SELECT * FROM milestones WHERE date = ? ORDER BY created_at ASC",
    [date]
  );
  return rows.map(parseMilestone);
}

export type CreateMilestoneData = Omit<
  LocalMilestone,
  "created_at" | "updated_at"
>;

export function createMilestone(
  db: SQLite.SQLiteDatabase,
  data: CreateMilestoneData
): LocalMilestone {
  db.runSync(
    `INSERT INTO milestones (id, title, category, date, notes, template_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.title,
      data.category,
      data.date,
      data.notes ?? null,
      data.template_key ?? null,
    ]
  );

  const created = db.getFirstSync<RawMilestone>(
    "SELECT * FROM milestones WHERE id = ?",
    [data.id]
  );

  if (!created) {
    throw new Error("Failed to create milestone");
  }

  return parseMilestone(created);
}

export function deleteMilestone(
  db: SQLite.SQLiteDatabase,
  id: string
): void {
  db.runSync("DELETE FROM milestones WHERE id = ?", [id]);
}
