import { eq, and, gte, lte, asc, desc } from "drizzle-orm";
import { db } from "../database-context";
import { rom_measurements } from "../schema";
import type { RomMeasurement, CreateRomData } from "../../data/data-store.types";

function rowToRomMeasurement(
  row: typeof rom_measurements.$inferSelect
): RomMeasurement {
  return {
    id: row.id,
    date: row.date,
    flexion_degrees: row.flexion_degrees ?? null,
    extension_degrees: row.extension_degrees ?? null,
    quad_activation: row.quad_activation === 1,
  };
}

export async function getAllRomMeasurements(): Promise<RomMeasurement[]> {
  const rows = await db
    .select()
    .from(rom_measurements)
    .orderBy(asc(rom_measurements.date));
  return rows.map(rowToRomMeasurement);
}

export async function getRomMeasurementsByDateRange(
  startDate: string,
  endDate: string
): Promise<RomMeasurement[]> {
  const rows = await db
    .select()
    .from(rom_measurements)
    .where(and(gte(rom_measurements.date, startDate), lte(rom_measurements.date, endDate)))
    .orderBy(asc(rom_measurements.date));
  return rows.map(rowToRomMeasurement);
}

export async function getLatestRomMeasurement(): Promise<RomMeasurement | null> {
  const rows = await db
    .select()
    .from(rom_measurements)
    .orderBy(desc(rom_measurements.date))
    .limit(1);
  if (rows.length === 0) return null;
  return rowToRomMeasurement(rows[0]);
}

export async function createRomMeasurement(
  data: CreateRomData
): Promise<RomMeasurement> {
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

  return rowToRomMeasurement(rows[0]);
}
