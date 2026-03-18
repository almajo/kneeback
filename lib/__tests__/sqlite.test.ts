/**
 * Unit tests for lib/db/sqlite.ts schema initialization logic.
 *
 * We can't run expo-sqlite in jsdom, so we test the logic through mocks
 * that match the expo-sqlite v16 synchronous API.
 */

import { CURRENT_SCHEMA_VERSION, initializeDatabase } from "../db/sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// Minimal mock for SQLiteDatabase
// ---------------------------------------------------------------------------

type MockDb = {
  execSync: jest.Mock;
  runSync: jest.Mock;
  getAllSync: jest.Mock;
  getFirstSync: jest.Mock;
};

function makeMockDb(schemaVersion: number | null = null): MockDb {
  return {
    execSync: jest.fn(),
    runSync: jest.fn(),
    getAllSync: jest.fn().mockReturnValue([]),
    getFirstSync: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes("schema_version")) {
        return schemaVersion !== null ? { version: schemaVersion } : null;
      }
      return null;
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CURRENT_SCHEMA_VERSION", () => {
  it("is 1", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });
});

describe("initializeDatabase", () => {
  it("creates the schema_version table first", () => {
    const db = makeMockDb(null);
    initializeDatabase(db as unknown as SQLiteDatabase);
    const firstCall = db.execSync.mock.calls[0][0] as string;
    expect(firstCall).toContain("CREATE TABLE IF NOT EXISTS schema_version");
  });

  it("creates all tables when schema version is 0 (fresh install)", () => {
    const db = makeMockDb(null); // null → getFirstSync returns null → version = 0
    initializeDatabase(db as unknown as SQLiteDatabase);

    const allCreates = db.execSync.mock.calls.map((c: string[]) => c[0]);
    const tableNames = [
      "profile",
      "exercises",
      "content",
      "user_exercises",
      "daily_logs",
      "exercise_logs",
      "rom_measurements",
      "milestones",
      "user_achievements",
      "user_gate_criteria",
      "notification_preferences",
    ];

    for (const table of tableNames) {
      const found = allCreates.some((sql: string) =>
        sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`)
      );
      expect(found).toBe(true);
    }
  });

  it("inserts the schema version row when table is empty", () => {
    const db = makeMockDb(null);
    initializeDatabase(db as unknown as SQLiteDatabase);

    const insertCall = db.runSync.mock.calls.find(
      (c: [string, ...unknown[]]) =>
        typeof c[0] === "string" && c[0].includes("INSERT INTO schema_version")
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1]).toEqual([CURRENT_SCHEMA_VERSION]);
  });

  it("skips table creation when schema is already at current version", () => {
    const db = makeMockDb(CURRENT_SCHEMA_VERSION);
    initializeDatabase(db as unknown as SQLiteDatabase);

    // Only schema_version table creation should happen (the guard check)
    const allCreates = db.execSync.mock.calls.map((c: string[]) => c[0]);
    const nonVersionCreates = allCreates.filter(
      (sql: string) =>
        sql.includes("CREATE TABLE") &&
        !sql.includes("schema_version")
    );
    expect(nonVersionCreates).toHaveLength(0);
  });

  it("updates existing schema_version row when upgrading", () => {
    // Version 0 is represented by a row with version = 0
    const db = makeMockDb(0);
    // Override getFirstSync: first call returns row with version 0, subsequent call returns the row
    db.getFirstSync.mockImplementation((sql: string) => {
      if (sql.includes("SELECT version FROM schema_version")) {
        return { version: 0 };
      }
      // second call: checking if row exists before insert/update
      if (sql.includes("SELECT version FROM schema_version LIMIT 1")) {
        return { version: 0 };
      }
      return null;
    });

    initializeDatabase(db as unknown as SQLiteDatabase);

    const updateCall = db.runSync.mock.calls.find(
      (c: [string, ...unknown[]]) =>
        typeof c[0] === "string" && c[0].includes("UPDATE schema_version")
    );
    expect(updateCall).toBeDefined();
  });
});
