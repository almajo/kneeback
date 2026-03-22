import React, { useState, useEffect } from "react";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseAsync } from "expo-sqlite";
import * as schema from "./schema";
import migrations from "../../drizzle/migrations/migrations";
import { seedDatabase } from "./seed-data";

const DATABASE_NAME = "kneeback.db";

// Set in DatabaseProvider before any child component renders.
// The definite assignment assertion (!) is safe: DatabaseProvider renders null
// until openDatabaseAsync + migrations complete, so repos are never called before db is ready.
export let db!: ReturnType<typeof drizzle<typeof schema>>;
// Exposed for async queries that bypass the Drizzle sync worker path (avoids a
// SharedArrayBuffer length-truncation bug in expo-sqlite ≤16.0.10 on web for
// results larger than 255 bytes).
export let expoDb!: Awaited<ReturnType<typeof openDatabaseAsync>>;

export type DrizzleDb = typeof db;

// Run drizzle migrations using expo-sqlite's async API (no SharedArrayBuffer / sync ops needed).
// Mirrors what drizzle's SQLiteSyncDialect#migrate does, but fully async.
async function runMigrationsAsync(
  expo: Awaited<ReturnType<typeof openDatabaseAsync>>
) {
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text    NOT NULL,
      created_at numeric
    )
  `);

  const applied = await expo.getAllAsync<{ hash: string }>(
    'SELECT hash FROM "__drizzle_migrations"'
  );
  const appliedHashes = new Set(applied.map((r) => r.hash));

  const journal = migrations.journal as {
    entries: Array<{ idx: number; tag: string; breakpoints: boolean }>;
  };

  // Detect existing pre-Drizzle installs: if the DB already has user tables but no
  // applied migrations, mark the baseline migration as already applied so we don't
  // try to re-run CREATE TABLE statements that would fail with "table already exists".
  if (appliedHashes.size === 0 && journal.entries.length > 0) {
    const existingTables = await expo.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'"
    );
    if (existingTables.length > 0) {
      const baselineTag = journal.entries[0].tag;
      await expo.runAsync(
        'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)',
        [baselineTag, Date.now()]
      );
      appliedHashes.add(baselineTag);
    }
  }

  for (const entry of journal.entries) {
    if (appliedHashes.has(entry.tag)) continue;

    const key = `m${String(entry.idx).padStart(4, "0")}` as keyof typeof migrations.migrations;
    const sql = migrations.migrations[key] as string;

    // drizzle uses '--> statement-breakpoint' to delimit individual statements
    const statements = entry.breakpoints
      ? sql.split("--> statement-breakpoint")
      : [sql];

    // Run each migration atomically so a crash mid-migration leaves the DB consistent.
    await expo.execAsync("BEGIN");
    try {
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed) await expo.execAsync(trimmed);
      }
      await expo.runAsync(
        'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)',
        [entry.tag, Date.now()]
      );
      await expo.execAsync("COMMIT");
    } catch (err) {
      await expo.execAsync("ROLLBACK");
      throw err;
    }
  }
}

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    openDatabaseAsync(DATABASE_NAME, { enableChangeListener: true })
      .then(async (expo) => {
        await runMigrationsAsync(expo);
        expoDb = expo;
        db = drizzle(expo, { schema });
        await seedDatabase();
        setReady(true);
      })
      .catch((err: Error) => setInitError(err));
  }, []);

  if (initError) throw initError;
  if (!ready) return null;

  return <>{children}</>;
}

export function useDatabase() {
  return db;
}
