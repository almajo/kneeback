import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../auth-context";
import { GATE_DEFINITIONS } from "../phase-gates";
import type { GateDefinition, GateProgress, GateCriterion, UserGateCriteria } from "../types";
import type { SurgeryStatus } from "./use-today";

// Gates 1 and 2 are informational / research-gap; only compute progress for 3-5.
const ACTIONABLE_GATE_KEYS = new Set(["gate_3", "gate_4", "gate_5"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConfirmedSet(rows: UserGateCriteria[]): Set<string> {
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
    const criteriaStatus = (gate.criteria as GateCriterion[]).map((criterion: GateCriterion) => ({
      criterion,
      met: isCriterionMet(criterion, confirmedSet, gate.gateKey, daysSinceSurgery, latestFlexion),
    }));

    const metCount = criteriaStatus.filter((cs: { criterion: GateCriterion; met: boolean }) => cs.met).length;
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
  const { session } = useAuth();
  const userId = session?.user.id;

  const [confirmedRows, setConfirmedRows] = useState<UserGateCriteria[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCriteria = useCallback(async () => {
    if (!userId) {
      setConfirmedRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_gate_criteria")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("[usePhaseGate] Failed to fetch user_gate_criteria:", error.message);
        setConfirmedRows([]);
      } else {
        setConfirmedRows((data as UserGateCriteria[]) ?? []);
      }
    } catch (err) {
      console.error("[usePhaseGate] Unexpected error fetching criteria:", err);
      setConfirmedRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCriteria();
  }, [fetchCriteria]);

  const confirmedCriteria = buildConfirmedSet(confirmedRows);

  const gateProgress = computeGateProgress(confirmedCriteria, daysSinceSurgery, latestFlexion);

  const toggleCriterion = useCallback(
    async (gateKey: string, criterionKey: string) => {
      if (!userId) return;

      const compositeKey = `${gateKey}:${criterionKey}`;
      const isCurrentlyConfirmed = confirmedCriteria.has(compositeKey);

      try {
        if (isCurrentlyConfirmed) {
          const { error } = await supabase
            .from("user_gate_criteria")
            .delete()
            .eq("user_id", userId)
            .eq("gate_key", gateKey)
            .eq("criterion_key", criterionKey);

          if (error) {
            console.error("[usePhaseGate] Failed to delete criterion:", error.message);
            return;
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const { error } = await (supabase.from("user_gate_criteria") as any).insert({
            user_id: userId,
            gate_key: gateKey,
            criterion_key: criterionKey,
            confirmed_at: new Date().toISOString(),
          });

          if (error) {
            console.error("[usePhaseGate] Failed to insert criterion:", error.message);
            return;
          }
        }

        // Re-fetch to keep state consistent with the database
        await fetchCriteria();
      } catch (err) {
        console.error("[usePhaseGate] Unexpected error in toggleCriterion:", err);
      }
    },
    [userId, confirmedCriteria, fetchCriteria]
  );

  return {
    gateProgress,
    confirmedCriteria,
    toggleCriterion,
    loading,
  };
}
