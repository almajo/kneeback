import React from "react";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { initializeDatabase } from "./sqlite";
import { seedDatabase } from "./seed-data";

const DATABASE_NAME = "kneeback.db";

async function onDatabaseInit(db: ReturnType<typeof useSQLiteContext>): Promise<void> {
  initializeDatabase(db);
  seedDatabase(db);
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
