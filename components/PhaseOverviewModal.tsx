import { Modal, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { Colors } from "../constants/colors";
import { PHASES_ORDERED, PHASE_DISPLAY_NAMES, PHASE_COLORS } from "../lib/phase-gates";
import type { ExercisePhase } from "../lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PULL_QUOTES = [
  {
    stat: "51%",
    detail: "risk reduction per month waited past 9 months",
    source: "Grindem et al., 2016",
  },
  {
    stat: "4×",
    detail: "lower graft rupture risk when all RTS criteria met",
    source: "Kyritsis et al., 2016",
  },
] as const;

// Phases that have a meaningful gate with formal criteria (gates 3, 4, 5)
const PHASES_WITH_GATE_CRITERIA = new Set<ExercisePhase>([
  "strengthening",
  "advanced_strengthening",
  "return_to_sport",
]);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PullQuoteCard({ stat, detail, source }: { stat: string; detail: string; source: string }) {
  return (
    <View
      style={{
        backgroundColor: Colors.primary + "15",
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 48,
          fontWeight: "800",
          color: Colors.primary,
          lineHeight: 52,
          marginBottom: 6,
        }}
      >
        {stat}
      </Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: Colors.text,
          lineHeight: 22,
          marginBottom: 6,
        }}
      >
        {detail}
      </Text>
      <Text style={{ fontSize: 12, color: Colors.textMuted, fontStyle: "italic" }}>
        — {source}
      </Text>
    </View>
  );
}

function GateCriteriaPill() {
  return (
    <View
      style={{
        backgroundColor: Colors.primary + "20",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
        marginTop: 4,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: Colors.primary }}>
        Gate criteria
      </Text>
    </View>
  );
}

interface PhaseRowProps {
  phaseEntry: (typeof PHASES_ORDERED)[number];
  index: number;
  isLast: boolean;
}

function PhaseRow({ phaseEntry, index, isLast }: PhaseRowProps) {
  const { key } = phaseEntry;
  const displayInfo = PHASE_DISPLAY_NAMES[key];
  const phaseColor = PHASE_COLORS[key];
  const hasGateCriteria = PHASES_WITH_GATE_CRITERIA.has(key);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      {/* Left column: dot + connector line */}
      <View style={{ alignItems: "center", width: 32, marginRight: 14 }}>
        {/* Colored circle with phase number */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: phaseColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{index + 1}</Text>
        </View>

        {/* Vertical connector line (skip for last item) */}
        {!isLast && (
          <View
            style={{
              width: 2,
              flex: 1,
              minHeight: 28,
              backgroundColor: Colors.border,
              marginTop: 4,
            }}
          />
        )}
      </View>

      {/* Right column: phase info */}
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.text }}>
            {displayInfo.label}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: phaseColor,
              backgroundColor: phaseColor + "18",
              borderRadius: 999,
              paddingHorizontal: 7,
              paddingVertical: 2,
            }}
          >
            {displayInfo.weekRange}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
          {displayInfo.sublabel}
        </Text>
        {hasGateCriteria && <GateCriteriaPill />}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PhaseOverviewModal({ visible, onDismiss }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
        {/* Scrollable content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ----------------------------------------------------------------
           * Header
           * -------------------------------------------------------------- */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: Colors.text,
              lineHeight: 34,
              marginBottom: 12,
            }}
          >
            Your Recovery is Built on Research
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: Colors.textSecondary,
              lineHeight: 24,
              marginBottom: 28,
            }}
          >
            Kneeback shows you what the research says — so you and your PT can make informed
            decisions together.
          </Text>

          {/* ----------------------------------------------------------------
           * Pull-quote cards
           * -------------------------------------------------------------- */}
          {PULL_QUOTES.map((quote) => (
            <PullQuoteCard key={quote.stat} {...quote} />
          ))}

          {/* ----------------------------------------------------------------
           * Philosophy statement
           * -------------------------------------------------------------- */}
          <View
            style={{
              backgroundColor: Colors.surfaceAlt,
              borderRadius: 16,
              padding: 20,
              marginTop: 4,
              marginBottom: 28,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: Colors.text,
                marginBottom: 10,
              }}
            >
              We show research, you decide
            </Text>
            <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 22 }}>
              Kneeback isn&apos;t your doctor. We surface the evidence — the gates, the criteria, the
              studies — so you and your care team can make truly informed decisions. Gates are
              advisory, not blocking. You&apos;re always in control.
            </Text>
          </View>

          {/* ----------------------------------------------------------------
           * Phase timeline
           * -------------------------------------------------------------- */}
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: Colors.text,
              marginBottom: 20,
            }}
          >
            Your 6-Phase Journey
          </Text>

          <View>
            {PHASES_ORDERED.map((phaseEntry, index) => (
              <PhaseRow
                key={phaseEntry.key}
                phaseEntry={phaseEntry}
                index={index}
                isLast={index === PHASES_ORDERED.length - 1}
              />
            ))}
          </View>

          {/* ----------------------------------------------------------------
           * Footer note
           * -------------------------------------------------------------- */}
          <Text
            style={{
              fontSize: 12,
              color: Colors.textMuted,
              textAlign: "center",
              lineHeight: 18,
              marginTop: 28,
              paddingHorizontal: 8,
            }}
          >
            Always follow your surgeon&apos;s and physiotherapist&apos;s guidance. This information is
            educational only.
          </Text>
        </ScrollView>

        {/* ------------------------------------------------------------------
         * Sticky footer button
         * ---------------------------------------------------------------- */}
        <View
          style={{
            padding: 20,
            paddingBottom: Platform.OS === "ios" ? 8 : 20,
            borderTopWidth: 1,
            borderTopColor: Colors.borderLight,
            backgroundColor: Colors.surface,
          }}
        >
          <TouchableOpacity
            onPress={onDismiss}
            style={{
              backgroundColor: Colors.primary,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              {"Got it, let's go"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
