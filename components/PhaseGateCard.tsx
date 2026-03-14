import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { PHASE_COLORS, PHASE_DISPLAY_NAMES } from "../lib/phase-gates";
import type { GateProgress } from "../lib/types";
import type { SurgeryStatus } from "../lib/hooks/use-today";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  gateProgress: GateProgress[];
  daysSinceSurgery: number;
  surgeryStatus: SurgeryStatus;
  onViewDetail: (gateKey: string) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PrehabilationCard() {
  return (
    <View
      className="mx-4 mb-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: "row",
      }}
    >
      {/* Left color accent strip */}
      <View style={{ width: 4, backgroundColor: PHASE_COLORS.prehab }} />

      <View style={{ flex: 1, padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Phase Gate
          </Text>
          <View
            style={{
              backgroundColor: PHASE_COLORS.prehab + "20",
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: PHASE_COLORS.prehab }}>
              Prehabilitation Phase
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 4 }}>
          Prepare for Surgery
        </Text>

        <Text style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 18 }}>
          Build strength and mobility before your operation to improve recovery outcomes.
        </Text>

        <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 8 }}>
          {PHASE_DISPLAY_NAMES.prehab.weekRange}
        </Text>
      </View>
    </View>
  );
}

interface GateCardProps {
  gateProgress: GateProgress;
  onViewDetail: (gateKey: string) => void;
}

function GateCard({ gateProgress, onViewDetail }: GateCardProps) {
  const { gate, metCount, totalCount, allMet } = gateProgress;

  const phaseColor = PHASE_COLORS[gate.fromPhase] ?? Colors.primary;
  const progressRatio = totalCount > 0 ? metCount / totalCount : 0;

  return (
    <View
      className="mx-4 mb-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: "row",
      }}
    >
      {/* Left color accent strip */}
      <View style={{ width: 4, backgroundColor: phaseColor }} />

      <View style={{ flex: 1, padding: 16 }}>
        {/* Header row */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Phase Gate
          </Text>
          {allMet && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: Colors.success + "15",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.success }}>Complete</Text>
            </View>
          )}
        </View>

        {/* Gate title */}
        <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 10 }}>
          {gate.title}
        </Text>

        {/* Progress bar */}
        <View
          style={{
            height: 6,
            backgroundColor: Colors.borderLight,
            borderRadius: 3,
            overflow: "hidden",
            marginBottom: 6,
          }}
        >
          <View
            style={{
              height: 6,
              width: `${Math.round(progressRatio * 100)}%`,
              backgroundColor: allMet ? Colors.success : phaseColor,
              borderRadius: 3,
            }}
          />
        </View>

        {/* Progress text */}
        <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 6 }}>
          {metCount} of {totalCount} criteria met
        </Text>

        {/* Source citation */}
        <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 10 }}>
          Source: {gate.source}
        </Text>

        {/* View detail link */}
        <TouchableOpacity
          onPress={() => onViewDetail(gate.gateKey)}
          style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: phaseColor }}>
            View details
          </Text>
          <Ionicons name="arrow-forward" size={13} color={phaseColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PhaseGateCard({ gateProgress, surgeryStatus, onViewDetail }: Props) {
  if (surgeryStatus === "pre_surgery" || surgeryStatus === "no_date") {
    return <PrehabilationCard />;
  }

  if (gateProgress.length === 0) {
    return null;
  }

  return (
    <>
      {gateProgress.map((gp) => (
        <GateCard key={gp.gate.gateKey} gateProgress={gp} onViewDetail={onViewDetail} />
      ))}
    </>
  );
}
