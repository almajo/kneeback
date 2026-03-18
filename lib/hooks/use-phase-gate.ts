import { useState, useEffect, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { GATE_DEFINITIONS } from "../phase-gates";
import {
  getAllGateCriteria,
  confirmGateCriterion,
  removeGateCriterion,
  type LocalUserGateCriterion,
} from "../db/repositories/gate-criteria-repo";
import type { GateDefinition, GateProgress, GateCriterion } from "../types";
import type { SurgeryStatus } from "./use-today";

// Gates 1 and 2 are informational / research-gap; only compute progress for 3-5.
const ACTIONABLE_GATE_KEYS = new Set(["gate_3", "gate_4", "gate_5"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConfirmedSet(rows: LocalUserGateCriterion[]): Set<string> {
  return new Set(rows.map((row) => `${row.gate_key}:${row.criterion_key}`));
}

function isCriterionMet(
  criterion: GateCriterion,
  confirmedSet: Set<string>,
  gateKey: string,
  daysSinceSurgery: number,
  latestFlexion: number | null
): boolean {
  switch (criterion.type) {
    case "auto_days":
      return criterion.minDays !== undefined && daysSinceSurgery >= criterion.minDays;
    case "auto_rom":
      return (
        latestFlexion !== null &&
        criterion.minFlexionDegrees !== undefined &&
        latestFlexion >= criterion.minFlexionDegrees
      );
    case "self_report":
      return confirmedSet.has(`${gateKey}:${criterion.key}`);
    default:
      return false;
  }
}

function computeGateProgress(
  confirmedSet: Set<string>,
  daysSinceSurgery: number,
  latestFlexion: number | null
): GateProgress[] {
  const actionableGates = (GATE_DEFINITIONS as readonly GateDefinition[]).filter(
    (gate) => ACTIONABLE_GATE_KEYS.has(gate.gateKey)
  );

  return actionableGates.map((gate) => {
    const criteriaStatus = (gate.criteria as GateCriterion[]).map(
      (criterion: GateCriterion) => ({
        criterion,
        met: isCriterionMet(
          criterion,
          confirmedSet,
          gate.gateKey,
          daysSinceSurgery,
          latestFlexion
        ),
      })
    );

    const metCount = criteriaStatus.filter(
      (cs: { criterion: GateCriterion; met: boolean }) => cs.met
    ).length;
    const totalCount = criteriaStatus.length;

    return {
      gate,
      metCount,
      totalCount,
      allMet: totalCount > 0 && metCount === totalCount,
      criteriaStatus,
    };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePhaseGate(
  daysSinceSurgery: number,
  surgeryStatus: SurgeryStatus,
  latestFlexion: number | null
) {
  const db = useSQLiteContext();

  const [confirmedRows, setConfirmedRows] = useState<LocalUserGateCriterion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCriteria = useCallback(() => {
    setLoading(true);
    try {
      const rows = getAllGateCriteria(db);
      setConfirmedRows(rows);
    } catch (err) {
      console.error("[usePhaseGate] Failed to fetch user_gate_criteria:", err);
      setConfirmedRows([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchCriteria();
  }, [fetchCriteria]);

  const confirmedCriteria = buildConfirmedSet(confirmedRows);

  const gateProgress = computeGateProgress(
    confirmedCriteria,
    daysSinceSurgery,
    latestFlexion
  );

  const toggleCriterion = useCallback(
    (gateKey: string, criterionKey: string): void => {
      const compositeKey = `${gateKey}:${criterionKey}`;
      const isCurrentlyConfirmed = confirmedCriteria.has(compositeKey);

      try {
        if (isCurrentlyConfirmed) {
          removeGateCriterion(db, gateKey, criterionKey);
        } else {
          confirmGateCriterion(db, gateKey, criterionKey);
        }
        fetchCriteria();
      } catch (err) {
        console.error("[usePhaseGate] Unexpected error in toggleCriterion:", err);
      }
    },
    [db, confirmedCriteria, fetchCriteria]
  );

  return {
    gateProgress,
    confirmedCriteria,
    toggleCriterion,
    loading,
  };
}
