import { View, Text } from "react-native";
import { Colors } from "../constants/colors";

interface Props {
  day: number;
  week: number;
  streak?: number;
  phase?: string;
}

function getPhase(daysSinceSurgery: number): string {
  if (daysSinceSurgery <= 14) return "Acute Phase";
  if (daysSinceSurgery <= 42) return "Early Rehab";
  if (daysSinceSurgery <= 90) return "Strengthening";
  return "Return to Activity";
}

export function DayHeader({ day, week, streak = 0, phase }: Props) {
  const phaseName = phase ?? getPhase(day);

  return (
    <View className="items-center py-6 mx-4 mb-2 border-b border-border">
      <Text className="text-5xl font-bold text-primary">Day {day}</Text>
      <Text className="text-base mt-1" style={{ color: "#6B6B6B" }}>Week {week} of recovery</Text>

      <View className="flex-row items-center gap-2 mt-3">
        {/* Phase badge */}
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: Colors.secondary + "20" }}
        >
          <Text className="text-xs font-semibold" style={{ color: Colors.secondaryDark }}>
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
