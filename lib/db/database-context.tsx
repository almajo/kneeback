import React, { useState, useEffect } from "react";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseAsync } from "expo-sqlite";
import * as schema from "./schema";
import migrations from "../../drizzle/migrations/migrations";

const DATABASE_NAME = "kneeback.db";

// Set in DatabaseProvider before any child component renders.
// The definite assignment assertion (!) is safe: DatabaseProvider renders null
// until openDatabaseAsync + migrations complete, so repos are never called before db is ready.
export let db!: ReturnType<typeof drizzle<typeof schema>>;

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

  for (const entry of journal.entries) {
    if (appliedHashes.has(entry.tag)) continue;

    const key = `m${String(entry.idx).padStart(4, "0")}` as keyof typeof migrations.migrations;
    const sql = migrations.migrations[key] as string;

    // drizzle uses '--> statement-breakpoint' to delimit individual statements
    const statements = entry.breakpoints
      ? sql.split("--> statement-breakpoint")
      : [sql];

    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) await expo.execAsync(trimmed);
    }

    await expo.runAsync(
      'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)',
      [entry.tag, Date.now()]
    );
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
        db = drizzle(expo, { schema });
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
