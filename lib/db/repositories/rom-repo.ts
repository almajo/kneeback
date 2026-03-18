import * as SQLite from "expo-sqlite";

export interface LocalRomMeasurement {
  id: string;
  date: string;
  flexion_degrees: number | null;
  extension_degrees: number | null;
  quad_activation: boolean;
  created_at: string;
  updated_at: string;
}

type RawRomMeasurement = Omit<LocalRomMeasurement, "quad_activation"> & {
  quad_activation: number;
};

function parseRomMeasurement(raw: RawRomMeasurement): LocalRomMeasurement {
  return {
    ...raw,
    quad_activation: raw.quad_activation === 1,
  };
}

export function getAllRomMeasurements(
  db: SQLite.SQLiteDatabase
): LocalRomMeasurement[] {
  const rows = db.getAllSync<RawRomMeasurement>(
    "SELECT * FROM rom_measurements ORDER BY date ASC"
  );
  return rows.map(parseRomMeasurement);
}

export function getRomMeasurementsByDateRange(
  db: SQLite.SQLiteDatabase,
  startDate: string,
  endDate: string
): LocalRomMeasurement[] {
  const rows = db.getAllSync<RawRomMeasurement>(
    "SELECT * FROM rom_measurements WHERE date >= ? AND date <= ? ORDER BY date ASC",
    [startDate, endDate]
  );
  return rows.map(parseRomMeasurement);
}

export type CreateRomMeasurementData = Omit<
  LocalRomMeasurement,
  "created_at" | "updated_at"
>;

export function createRomMeasurement(
  db: SQLite.SQLiteDatabase,
  data: CreateRomMeasurementData
): LocalRomMeasurement {
  db.runSync(
    `INSERT INTO rom_measurements
      (id, date, flexion_degrees, extension_degrees, quad_activation)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.id,
      data.date,
      data.flexion_degrees ?? null,
      data.extension_degrees ?? null,
      data.quad_activation ? 1 : 0,
    ]
  );

  const created = db.getFirstSync<RawRomMeasurement>(
    "SELECT * FROM rom_measurements WHERE id = ?",
    [data.id]
  );

  if (!created) {
    throw new Error("Failed to create ROM measurement");
  }

  return parseRomMeasurement(created);
}
