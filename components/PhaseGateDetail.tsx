import { Modal, View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { PHASE_COLORS, PHASE_DISPLAY_NAMES } from "../lib/phase-gates";
import type { GateProgress, GateCriterion } from "../lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  gateKey: string | null;
  gateProgress: GateProgress[];
  confirmedCriteria: Set<string>;
  daysSinceSurgery: number;
  latestFlexion: number | null;
  onToggleCriterion: (gateKey: string, criterionKey: string) => Promise<void>;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Criterion row sub-component
// ---------------------------------------------------------------------------

interface CriterionRowProps {
  criterion: GateCriterion;
  met: boolean;
  gateKey: string;
  daysSinceSurgery: number;
  latestFlexion: number | null;
  onToggle: (gateKey: string, criterionKey: string) => Promise<void>;
}

function CriterionRow({
  criterion,
  met,
  gateKey,
  daysSinceSurgery,
  latestFlexion,
  onToggle,
}: CriterionRowProps) {
  const isSelfReport = criterion.type === "self_report";
  const isAutoDays = criterion.type === "auto_days";
  const isAutoRom = criterion.type === "auto_rom";

  // Build status sub-text for auto criteria
  function buildAutoStatus(): string {
    if (isAutoDays && criterion.minDays !== undefined) {
      if (met) return `Day ${daysSinceSurgery} — requirement met`;
      return `Day ${daysSinceSurgery} of ${criterion.minDays} required`;
    }
    if (isAutoRom && criterion.minFlexionDegrees !== undefined) {
      if (latestFlexion === null) return `No ROM logged yet — ${criterion.minFlexionDegrees}° required`;
      if (met) return `${latestFlexion}° — requirement met`;
      return `${latestFlexion}° of ${criterion.minFlexionDegrees}° required`;
    }
    return "";
  }

  const autoStatus = !isSelfReport ? buildAutoStatus() : "";

  // Icon for the row
  function renderIcon() {
    if (met) {
      return <Ionicons name="checkmark-circle" size={22} color={Colors.success} />;
    }
    if (isAutoDays || isAutoRom) {
      return <Ionicons name="time-outline" size={22} color={Colors.warning} />;
    }
    // Unmet self-report — checkbox-style toggle
    return (
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: Colors.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
      }}
    >
      <View style={{ marginTop: 1 }}>{renderIcon()}</View>

      <View style={{ flex: 1 }}>
        {/* Plain label */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: met ? Colors.textSecondary : Colors.text,
            lineHeight: 20,
            textDecorationLine: met ? "line-through" : "none",
          }}
        >
          {criterion.plainLabel}
        </Text>

        {/* Auto criteria status */}
        {autoStatus !== "" && (
          <Text style={{ fontSize: 12, color: met ? Colors.success : Colors.warning, marginTop: 3 }}>
            {autoStatus}
          </Text>
        )}

        {/* Technical label + source */}
        <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>
          {criterion.label} · {criterion.source}
        </Text>
      </View>
    </View>
  );

  if (isSelfReport) {
    return (
      <TouchableOpacity
        onPress={() => onToggle(gateKey, criterion.key)}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View>{content}</View>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PhaseGateDetail({
  visible,
  gateKey,
  gateProgress,
  daysSinceSurgery,
  latestFlexion,
  onToggleCriterion,
  onClose,
}: Props) {
  const found = gateProgress.find((gp) => gp.gate.gateKey === gateKey) ?? null;

  if (!found) {
    // Render nothing (modal closed or gateKey not found)
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
          <TouchableOpacity
            onPress={onClose}
            style={{ padding: 20, alignSelf: "flex-end" }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  const { gate, metCount, totalCount, criteriaStatus } = found;
  const phaseColor = PHASE_COLORS[gate.fromPhase] ?? Colors.primary;
  const phaseInfo = PHASE_DISPLAY_NAMES[gate.fromPhase];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
        {/* Sticky header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: Colors.borderLight,
            backgroundColor: Colors.surface,
          }}
        >
          {/* Phase label */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: phaseColor,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 2,
            }}
          >
            {phaseInfo?.label ?? gate.fromPhase}
          </Text>

          {/* Title row + close button */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: Colors.text,
                flex: 1,
                marginRight: 12,
                lineHeight: 24,
              }}
            >
              {gate.title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Source citation */}
          <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>
            Source: {gate.source}
          </Text>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Disclaimer */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
              backgroundColor: Colors.warning + "15",
              borderRadius: 12,
              padding: 12,
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <Ionicons name="information-circle-outline" size={16} color={Colors.warning} style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 12, color: Colors.text, flex: 1, lineHeight: 17 }}>
              Not medical advice — always consult your surgeon and PT.
            </Text>
          </View>

          {/* Research gap notice */}
          {gate.researchGap === true && (
            <View
              style={{
                backgroundColor: Colors.surfaceAlt,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 4 }}>
                Research Gap
              </Text>
              <Text style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 18 }}>
                {gate.warningMessage}
              </Text>
            </View>
          )}

          {/* Criteria list */}
          {criteriaStatus.length > 0 ? (
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: Colors.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Criteria
              </Text>
              {criteriaStatus.map(({ criterion, met }) => (
                <CriterionRow
                  key={criterion.key}
                  criterion={criterion}
                  met={met}
                  gateKey={gate.gateKey}
                  daysSinceSurgery={daysSinceSurgery}
                  latestFlexion={latestFlexion}
                  onToggle={onToggleCriterion}
                />
              ))}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: Colors.surfaceAlt,
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
                marginVertical: 12,
              }}
            >
              <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 }}>
                {gate.warningMessage}
              </Text>
            </View>
          )}

          {/* Progress summary */}
          {totalCount > 0 && (
            <View
              style={{
                marginTop: 20,
                backgroundColor: Colors.surfaceAlt,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text }}>
                  {metCount} of {totalCount} criteria met
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: phaseColor }}>
                  {Math.round((metCount / totalCount) * 100)}%
                </Text>
              </View>

              {/* Progress bar */}
              <View
                style={{
                  height: 8,
                  backgroundColor: Colors.border,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 8,
                    width: `${Math.round((metCount / totalCount) * 100)}%`,
                    backgroundColor: metCount === totalCount ? Colors.success : phaseColor,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          )}

          {/* 24/48h soreness rule tip */}
          <View
            style={{
              marginTop: 16,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              backgroundColor: Colors.secondary + "15",
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: Colors.secondary + "30",
            }}
          >
            <Ionicons name="bulb-outline" size={18} color={Colors.secondaryDark} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.secondaryDark, marginBottom: 3 }}>
                24h / 48h Soreness Rule
              </Text>
              <Text style={{ fontSize: 12, color: Colors.textSecondary, lineHeight: 17 }}>
                Mild soreness after exercise is normal. If pain exceeds 3/10 or persists beyond 24h, reduce intensity. If it persists beyond 48h, rest and consult your PT.
              </Text>
            </View>
          </View>

          {/* Informational only notice */}
          {gate.informationalOnly === true && (
            <View
              style={{
                marginTop: 12,
                backgroundColor: Colors.surfaceAlt,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <Text style={{ fontSize: 12, color: Colors.textSecondary, lineHeight: 17 }}>
                These criteria are informational. Your surgeon and physiotherapist determine progression — this is a reference only.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
