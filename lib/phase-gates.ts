import type { ExercisePhase, GateDefinition } from "./types";
import type { SurgeryStatus } from "./hooks/use-today";

// ---------------------------------------------------------------------------
// Phase colours
// ---------------------------------------------------------------------------

export const PHASE_COLORS: Record<ExercisePhase, string> = {
  prehab: "#7C3AED",
  acute: "#3B82F6",
  early_active: "#0D9488",
  strengthening: "#FF6B35",
  advanced_strengthening: "#E11D48",
  return_to_sport: "#16A34A",
};

// ---------------------------------------------------------------------------
// Phase display names
// ---------------------------------------------------------------------------

export interface PhaseDisplayInfo {
  label: string;
  sublabel: string;
  weekRange: string;
}

export const PHASE_DISPLAY_NAMES: Record<ExercisePhase, PhaseDisplayInfo> = {
  prehab: {
    label: "Prehabilitation",
    sublabel: "Prepare for Surgery",
    weekRange: "Pre-Surgery",
  },
  acute: {
    label: "Immediate Post-Op",
    sublabel: "Early Recovery",
    weekRange: "Weeks 0–2",
  },
  early_active: {
    label: "Early Rehabilitation",
    sublabel: "Getting Moving",
    weekRange: "Weeks 2–6",
  },
  strengthening: {
    label: "Progressive Strengthening",
    sublabel: "Building Strength",
    weekRange: "Weeks 6–12",
  },
  advanced_strengthening: {
    label: "Advanced Strengthening",
    sublabel: "Preparing for Sport",
    weekRange: "Months 3–6",
  },
  return_to_sport: {
    label: "Return to Sport",
    sublabel: "Final Push",
    weekRange: "Months 6–9+",
  },
};

// ---------------------------------------------------------------------------
// Ordered phases with unlock thresholds
// ---------------------------------------------------------------------------

export interface PhaseEntry {
  key: ExercisePhase;
  unlockDay: number;
}

export const PHASES_ORDERED: readonly PhaseEntry[] = [
  { key: "prehab", unlockDay: -Infinity },
  { key: "acute", unlockDay: 0 },
  { key: "early_active", unlockDay: 14 },
  { key: "strengthening", unlockDay: 42 },
  { key: "advanced_strengthening", unlockDay: 84 },
  { key: "return_to_sport", unlockDay: 168 },
] as const;

// ---------------------------------------------------------------------------
// Gate definitions
// ---------------------------------------------------------------------------

export const GATE_DEFINITIONS: readonly GateDefinition[] = [
  // Gate 1 — acute → early_active (informational only)
  {
    gateKey: "gate_1",
    fromPhase: "acute",
    toPhase: "early_active",
    informationalOnly: true,
    title: "Immediate Post-Op Criteria",
    criteria: [
      {
        key: "quiet_knee_extension",
        type: "self_report",
        label: "Full active knee extension (0°)",
        plainLabel: "Can you fully straighten your knee?",
        source: "Buckthorpe (2020)",
      },
      {
        key: "slr_without_lag",
        type: "self_report",
        label: "Quadriceps SLR without extension lag",
        plainLabel: "Can you raise your leg with knee fully straight?",
        source: "Buckthorpe (2020)",
      },
      {
        key: "trace_effusion",
        type: "self_report",
        label: "Trace or zero effusion",
        plainLabel: "Minimal swelling (trace or none)",
        source: "Buckthorpe (2020)",
      },
      {
        key: "pain_control",
        type: "self_report",
        label: "Pain 0–2/10 at rest and with activity",
        plainLabel: "Pain is well-controlled (under 2/10)",
        source: "Buckthorpe (2020)",
      },
    ],
    warningMessage:
      "Research suggests working toward these criteria, but your surgeon's brace protocol and any concurrent injuries (e.g., meniscus) may mean different timelines.",
    source: "Buckthorpe (2020)",
  },

  // Gate 2 — early_active → strengthening (research gap, no criteria)
  {
    gateKey: "gate_2",
    fromPhase: "early_active",
    toPhase: "strengthening",
    researchGap: true,
    title: "Early Rehab Transition",
    criteria: [],
    warningMessage:
      "Research does not define formal criteria for this transition. The first 6 weeks vary significantly based on surgeon protocol and concurrent injuries.",
    source: "Gee et al. (2022)",
  },

  // Gate 3 — strengthening → advanced_strengthening (return to running)
  {
    gateKey: "gate_3",
    fromPhase: "strengthening",
    toPhase: "advanced_strengthening",
    title: "Return to Running Criteria",
    criteria: [
      {
        key: "min_time_8wk",
        type: "auto_days",
        minDays: 56,
        label: "Minimum 8 weeks post-surgery",
        plainLabel: "At least 8 weeks since surgery",
        source: "Rambaud et al. (2018)",
      },
      {
        key: "full_rom",
        type: "auto_rom",
        minFlexionDegrees: 120,
        label: "Full ROM (flexion ≥ 120° or ≥ 95% of uninvolved)",
        plainLabel: "Good knee bend (120° or close to other side)",
        source: "Rambaud et al. (2018)",
      },
      {
        key: "pain_running",
        type: "self_report",
        label: "Pain during running < 2/10 VAS",
        plainLabel: "Can run with little or no pain (under 2/10)",
        source: "Rambaud et al. (2018)",
      },
      {
        key: "quad_lsi_70",
        type: "self_report",
        label: "Quad LSI ≥ 70% (isometric)",
        plainLabel: "My PT confirmed quad strength is ≥ 70% of other side",
        source: "Rambaud et al. (2018)",
      },
      {
        key: "hamstring_lsi_70",
        type: "self_report",
        label: "Hamstring LSI ≥ 70% (isometric)",
        plainLabel: "My PT confirmed hamstring strength is ≥ 70% of other side",
        source: "Rambaud et al. (2018)",
      },
      {
        key: "effusion_clear",
        type: "self_report",
        label: "Trace or zero effusion",
        plainLabel: "Little or no swelling",
        source: "Rambaud et al. (2018)",
      },
    ],
    warningMessage:
      "Research shows meeting these criteria before running significantly reduces re-injury risk. These are evidence-based thresholds from 201 studies.",
    source: "Rambaud et al. (2018)",
  },

  // Gate 4 — advanced_strengthening → return_to_sport (plyometric readiness)
  {
    gateKey: "gate_4",
    fromPhase: "advanced_strengthening",
    toPhase: "return_to_sport",
    title: "Plyometric Readiness Criteria",
    criteria: [
      {
        key: "min_time_16wk",
        type: "auto_days",
        minDays: 112,
        label: "Minimum 16 weeks post-surgery",
        plainLabel: "At least 16 weeks since surgery",
        source: "Buckthorpe & Villa (2021)",
      },
      {
        key: "sl_squat_quality",
        type: "self_report",
        label: "Single-leg squat with good control (no valgus)",
        plainLabel: "Single-leg squat with good knee control (no inward collapse)",
        source: "Buckthorpe & Villa (2021)",
      },
      {
        key: "sl_press_125bw",
        type: "self_report",
        label: "Single-leg leg press > 1.25× bodyweight",
        plainLabel: "My PT confirmed single-leg press > 1.25× my bodyweight",
        source: "Buckthorpe & Villa (2021)",
      },
      {
        key: "quad_lsi_80",
        type: "self_report",
        label: "Quad LSI ≥ 80%",
        plainLabel: "My PT confirmed quad strength is ≥ 80% of other side",
        source: "Buckthorpe & Villa (2021)",
      },
      {
        key: "good_run_kinematics",
        type: "self_report",
        label: "Running with good kinematics",
        plainLabel: "Running with good form (no limping or compensating)",
        source: "Buckthorpe & Villa (2021)",
      },
    ],
    warningMessage:
      "Plyometrics place high loads on the graft. These criteria help ensure your knee is ready for jumping, cutting, and high-impact movement.",
    source: "Buckthorpe & Villa (2021)",
  },

  // Gate 5 — return_to_sport → cleared (full return-to-sport battery)
  {
    gateKey: "gate_5",
    fromPhase: "return_to_sport",
    toPhase: "return_to_sport", // cleared is not a phase; toPhase stays as return_to_sport
    title: "Return to Sport Battery",
    criteria: [
      {
        key: "min_time_9mo",
        type: "auto_days",
        minDays: 273,
        label: "Minimum 9 months post-surgery",
        plainLabel: "At least 9 months since surgery",
        source: "Grindem et al. (2016)",
      },
      {
        key: "quad_lsi_90_iso",
        type: "self_report",
        label: "Isokinetic quad LSI ≥ 90%",
        plainLabel: "My PT confirmed isokinetic quad strength ≥ 90% of other side",
        source: "Grindem et al. (2016)",
      },
      {
        key: "hamstring_lsi_90_iso",
        type: "self_report",
        label: "Isokinetic hamstring LSI ≥ 90%",
        plainLabel: "My PT confirmed isokinetic hamstring strength ≥ 90% of other side",
        source: "Grindem et al. (2016)",
      },
      {
        key: "single_hop_lsi_90",
        type: "self_report",
        label: "Single hop test LSI ≥ 90%",
        plainLabel: "Single hop distance ≥ 90% of other side",
        source: "Grindem et al. (2016)",
      },
      {
        key: "triple_hop_lsi_90",
        type: "self_report",
        label: "Triple hop test LSI ≥ 90%",
        plainLabel: "Triple hop distance ≥ 90% of other side",
        source: "Grindem et al. (2016)",
      },
      {
        key: "crossover_hop_lsi_90",
        type: "self_report",
        label: "Triple crossover hop LSI ≥ 90%",
        plainLabel: "Triple crossover hop ≥ 90% of other side",
        source: "Grindem et al. (2016)",
      },
      {
        key: "ttest_11sec",
        type: "self_report",
        label: "Running T-test ≤ 11 seconds",
        plainLabel: "Running agility T-test completed in under 11 seconds",
        source: "Grindem et al. (2016)",
      },
      {
        key: "acl_rsi_80",
        type: "self_report",
        label: "ACL-RSI psychological readiness ≥ 80%",
        plainLabel: "ACL-RSI questionnaire score ≥ 80% (psychological readiness)",
        source: "Grindem et al. (2016)",
      },
      {
        key: "zero_effusion_full_rom",
        type: "self_report",
        label: "Zero effusion and full ROM",
        plainLabel: "No swelling and full range of motion",
        source: "Grindem et al. (2016)",
      },
    ],
    warningMessage:
      "Athletes who pass all return-to-sport criteria have 4× lower graft rupture risk (Kyritsis et al., 2016). Waiting at least 9 months reduces re-injury risk by 51% per month (Grindem et al., 2016).",
    source: "Grindem et al. (2016), Kyritsis et al. (2016)",
  },
] as const;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Determine the user's current rehab phase based on days since surgery and
 * surgery status.
 */
export function getPhaseFromDays(
  daysSinceSurgery: number,
  surgeryStatus: SurgeryStatus
): ExercisePhase {
  if (surgeryStatus === "pre_surgery" || surgeryStatus === "no_date") {
    return "prehab";
  }

  // Walk through phases in reverse order and return the first one the user
  // has reached (highest unlockDay <= daysSinceSurgery).
  for (let i = PHASES_ORDERED.length - 1; i >= 0; i--) {
    const entry = PHASES_ORDERED[i];
    if (daysSinceSurgery >= entry.unlockDay) {
      return entry.key;
    }
  }

  return "prehab";
}

/**
 * Return the gate that guards the exit FROM a given phase, i.e. the gate the
 * user must pass to move into the next phase.
 */
export function getGateForPhase(fromPhase: ExercisePhase): GateDefinition | undefined {
  return GATE_DEFINITIONS.find((gate) => gate.fromPhase === fromPhase);
}
