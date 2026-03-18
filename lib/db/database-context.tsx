import React from "react";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { initializeDatabase } from "./sqlite";
import { seedDatabase } from "./seed-data";

const DATABASE_NAME = "kneeback.db";

async function onDatabaseInit(db: ReturnType<typeof useSQLiteContext>): Promise<void> {
  try {
    initializeDatabase(db);
    seedDatabase(db);
  } catch (error) {
    console.error('[DatabaseProvider] Failed to initialize database:', error);
    throw error; // Re-throw so SQLiteProvider surfaces it to error boundary
  }
}

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={onDatabaseInit}>
      {children}
    </SQLiteProvider>
  );
}

export function useDatabase() {
  return useSQLiteContext();
}
