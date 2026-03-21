import { eq, and, gte, lte, asc, sql } from "drizzle-orm";
import { db } from "../database-context";
import { rom_measurements } from "../schema";

export interface LocalRomMeasurement {
  id: string;
  date: string;
  flexion_degrees: number | null;
  extension_degrees: number | null;
  quad_activation: boolean;
  created_at: string;
  updated_at: string;
}

function rowToLocalRomMeasurement(
  row: typeof rom_measurements.$inferSelect
): LocalRomMeasurement {
  return {
    id: row.id,
    date: row.date,
    flexion_degrees: row.flexion_degrees ?? null,
    extension_degrees: row.extension_degrees ?? null,
    quad_activation: row.quad_activation === 1,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getAllRomMeasurements(): Promise<LocalRomMeasurement[]> {
  const rows = await db
    .select()
    .from(rom_measurements)
    .orderBy(asc(rom_measurements.date));
  return rows.map(rowToLocalRomMeasurement);
}

export async function getRomMeasurementsByDateRange(
  startDate: string,
  endDate: string
): Promise<LocalRomMeasurement[]> {
  const rows = await db
    .select()
    .from(rom_measurements)
    .where(and(gte(rom_measurements.date, startDate), lte(rom_measurements.date, endDate)))
    .orderBy(asc(rom_measurements.date));
  return rows.map(rowToLocalRomMeasurement);
}

export type CreateRomMeasurementData = Omit<
  LocalRomMeasurement,
  "created_at" | "updated_at"
>;

export async function createRomMeasurement(
  data: CreateRomMeasurementData
): Promise<LocalRomMeasurement> {
  await db.insert(rom_measurements).values({
    id: data.id,
    date: data.date,
    flexion_degrees: data.flexion_degrees ?? null,
    extension_degrees: data.extension_degrees ?? null,
    quad_activation: data.quad_activation ? 1 : 0,
  });

  const rows = await db
    .select()
    .from(rom_measurements)
    .where(eq(rom_measurements.id, data.id));

  if (rows.length === 0) {
    throw new Error("Failed to create ROM measurement");
  }

  return rowToLocalRomMeasurement(rows[0]);
}
