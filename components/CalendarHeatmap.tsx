import { View, Text } from "react-native";
import { Colors } from "../constants/colors";

interface DayStatus {
  date: string;
  status: "complete" | "rest" | "partial" | "missed" | "future";
}

interface Props {
  days: DayStatus[];
  month: string; // "YYYY-MM"
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function statusColor(status: DayStatus["status"]): string {
  switch (status) {
    case "complete": return Colors.success;
    case "rest": return Colors.rest;
    case "partial": return Colors.warning;
    case "missed": return Colors.error + "60";
    case "future": return Colors.borderLight;
  }
}

export function CalendarHeatmap({ days, month }: Props) {
  return (
    <View className="mx-4 mb-4 bg-surface border border-border rounded-2xl p-4">
      <Text className="text-base font-semibold mb-3" style={{ color: "#2D2D2D" }}>
        {month} Activity
      </Text>
      <View className="flex-row mb-2">
        {DAY_LABELS.map((d, i) => (
          <Text key={i} className="flex-1 text-center text-xs font-semibold" style={{ color: "#A0A0A0" }}>
            {d}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {days.map((day) => (
          <View
            key={day.date}
            className="rounded-sm m-0.5"
            style={{
              width: `${100 / 7 - 2}%`,
              aspectRatio: 1,
              backgroundColor: statusColor(day.status),
            }}
          />
        ))}
      </View>
      <View className="flex-row gap-3 mt-3 flex-wrap">
        {[
          { label: "Complete", color: Colors.success },
          { label: "Rest", color: Colors.rest },
          { label: "Partial", color: Colors.warning },
        ].map((item) => (
          <View key={item.label} className="flex-row items-center gap-1">
            <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <Text className="text-xs" style={{ color: "#6B6B6B" }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
