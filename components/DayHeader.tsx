import { View, Text } from "react-native";
import { Colors } from "../constants/colors";
import type { SurgeryStatus } from "../lib/hooks/use-today";
import { getPhaseFromDays, PHASE_DISPLAY_NAMES, PHASE_COLORS } from "../lib/phase-gates";

interface Props {
  day: number;
  week: number;
  streak?: number;
  phase?: string;
  surgeryStatus?: SurgeryStatus;
  daysUntilSurgery?: number | null;
}

function getPhaseLabel(daysSinceSurgery: number, surgeryStatus: SurgeryStatus): { label: string; color: string } {
  const phaseKey = getPhaseFromDays(daysSinceSurgery, surgeryStatus);
  const info = PHASE_DISPLAY_NAMES[phaseKey];
  return { label: info.label, color: PHASE_COLORS[phaseKey] };
}

export function DayHeader({ day, week, streak = 0, phase, surgeryStatus = "post_surgery", daysUntilSurgery }: Props) {
  if (surgeryStatus === "pre_surgery" && daysUntilSurgery != null) {
    return (
      <View className="items-center py-6 mx-4 mb-2 border-b border-border">
        <Text className="text-5xl font-bold text-primary">{daysUntilSurgery}</Text>
        <Text className="text-base mt-1" style={{ color: "#6B6B6B" }}>
          {daysUntilSurgery === 1 ? "day until surgery" : "days until surgery"}
        </Text>
        <View className="mt-3 rounded-full px-3 py-1" style={{ backgroundColor: Colors.secondary + "20" }}>
          <Text className="text-xs font-semibold" style={{ color: Colors.secondaryDark }}>
            Pre-Surgery
          </Text>
        </View>
      </View>
    );
  }

  if (surgeryStatus === "no_date") {
    return null;
  }

  const { label: phaseName, color: phaseColor } = getPhaseLabel(day, surgeryStatus);

  return (
    <View className="items-center py-6 mx-4 mb-2 border-b border-border">
      <Text className="text-5xl font-bold text-primary">Day {day}</Text>
      <Text className="text-base mt-1" style={{ color: "#6B6B6B" }}>Week {week} of recovery</Text>

      <View className="flex-row items-center gap-2 mt-3">
        {/* Phase badge */}
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: phaseColor + "20" }}
        >
          <Text className="text-xs font-semibold" style={{ color: phaseColor }}>
            {phaseName}
          </Text>
        </View>

        {/* Streak badge */}
        {streak > 0 && (
          <View
            className="rounded-full px-3 py-1 flex-row items-center gap-1"
            style={{ backgroundColor: Colors.primary + "15" }}
          >
            <Text style={{ fontSize: 12 }}>🔥</Text>
            <Text className="text-xs font-semibold" style={{ color: Colors.primaryDark }}>
              {streak}-day streak
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
