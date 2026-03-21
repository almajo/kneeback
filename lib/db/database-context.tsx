import React from "react";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";
import migrations from "../../drizzle/migrations/migrations";

const DATABASE_NAME = "kneeback.db";

const expo = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
export const db = drizzle(expo, { schema });

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    throw error; // Let error boundary handle it
  }

  if (!success) {
    return null; // Migrations still running
  }

  return <>{children}</>;
}

// Export type for use in repositories
export type DrizzleDb = typeof db;

export function useDatabase() {
  return db;
}
