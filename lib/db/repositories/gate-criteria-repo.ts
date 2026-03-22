import { eq, and, asc } from "drizzle-orm";
import { db } from "../database-context";
import { user_gate_criteria } from "../schema";
import { generateId } from "../../utils/uuid";

export interface LocalUserGateCriterion {
  id: string;
  gate_key: string;
  criterion_key: string;
  confirmed_at: string;
  created_at: string;
  updated_at: string;
}

function rowToLocalUserGateCriterion(
  row: typeof user_gate_criteria.$inferSelect
): LocalUserGateCriterion {
  return {
    id: row.id,
    gate_key: row.gate_key,
    criterion_key: row.criterion_key,
    confirmed_at: row.confirmed_at,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function getAllGateCriteria(): Promise<LocalUserGateCriterion[]> {
  const rows = await db
    .select()
    .from(user_gate_criteria)
    .orderBy(asc(user_gate_criteria.confirmed_at));
  return rows.map(rowToLocalUserGateCriterion);
}

export async function getGateCriteriaByGate(
  gateKey: string
): Promise<LocalUserGateCriterion[]> {
  const rows = await db
    .select()
    .from(user_gate_criteria)
    .where(eq(user_gate_criteria.gate_key, gateKey))
    .orderBy(asc(user_gate_criteria.confirmed_at));
  return rows.map(rowToLocalUserGateCriterion);
}

export async function confirmGateCriterion(
  gateKey: string,
  criterionKey: string
): Promise<LocalUserGateCriterion> {
  const existing = await db
    .select()
    .from(user_gate_criteria)
    .where(
      and(
        eq(user_gate_criteria.gate_key, gateKey),
        eq(user_gate_criteria.criterion_key, criterionKey)
      )
    );

  if (existing.length > 0) {
    return rowToLocalUserGateCriterion(existing[0]);
  }

  const id = generateId();
  const confirmedAt = new Date().toISOString();

  await db.insert(user_gate_criteria).values({
    id,
    gate_key: gateKey,
    criterion_key: criterionKey,
    confirmed_at: confirmedAt,
  });

  const created = await db
    .select()
    .from(user_gate_criteria)
    .where(eq(user_gate_criteria.id, id));

  if (created.length === 0) {
    throw new Error(`Failed to confirm gate criterion: ${gateKey}/${criterionKey}`);
  }

  return rowToLocalUserGateCriterion(created[0]);
}

export async function removeGateCriterion(
  gateKey: string,
  criterionKey: string
): Promise<void> {
  await db
    .delete(user_gate_criteria)
    .where(
      and(
        eq(user_gate_criteria.gate_key, gateKey),
        eq(user_gate_criteria.criterion_key, criterionKey)
      )
    );
}
