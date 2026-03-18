import * as SQLite from "expo-sqlite";

export interface LocalUserGateCriterion {
  id: string;
  gate_key: string;
  criterion_key: string;
  confirmed_at: string;
  created_at: string;
  updated_at: string;
}

export function getGateCriteriaByGate(
  db: SQLite.SQLiteDatabase,
  gateKey: string
): LocalUserGateCriterion[] {
  return db.getAllSync<LocalUserGateCriterion>(
    "SELECT * FROM user_gate_criteria WHERE gate_key = ? ORDER BY confirmed_at ASC",
    [gateKey]
  );
}

export function confirmGateCriterion(
  db: SQLite.SQLiteDatabase,
  gateKey: string,
  criterionKey: string
): LocalUserGateCriterion {
  const existing = db.getFirstSync<LocalUserGateCriterion>(
    "SELECT * FROM user_gate_criteria WHERE gate_key = ? AND criterion_key = ?",
    [gateKey, criterionKey]
  );

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  const confirmedAt = new Date().toISOString();

  db.runSync(
    `INSERT INTO user_gate_criteria (id, gate_key, criterion_key, confirmed_at)
     VALUES (?, ?, ?, ?)`,
    [id, gateKey, criterionKey, confirmedAt]
  );

  const created = db.getFirstSync<LocalUserGateCriterion>(
    "SELECT * FROM user_gate_criteria WHERE id = ?",
    [id]
  );

  if (!created) {
    throw new Error(`Failed to confirm gate criterion: ${gateKey}/${criterionKey}`);
  }

  return created;
}

export function removeGateCriterion(
  db: SQLite.SQLiteDatabase,
  gateKey: string,
  criterionKey: string
): void {
  db.runSync(
    "DELETE FROM user_gate_criteria WHERE gate_key = ? AND criterion_key = ?",
    [gateKey, criterionKey]
  );
}
