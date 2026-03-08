import { View, Text } from "react-native";
import { Colors } from "../constants/colors";
import type { Milestone } from "../lib/types";

interface DayStatus {
  date: string;
  status: "complete" | "rest" | "partial" | "missed" | "future";
}

interface Props {
  days: DayStatus[];
  month: string; // "YYYY-MM"
  milestones?: Milestone[];
}

// Monday-first: Mon=0 ... Sun=6
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function statusColor(status: DayStatus["status"]): string {
  switch (status) {
    case "complete": return Colors.success;
    case "rest": return Colors.rest;
    case "partial": return Colors.warning;
    case "missed": return Colors.error + "60";
    case "future": return Colors.borderLight;
  }
}

// Returns 0=Monday ... 6=Sunday offset for the first day of the month
function getMonthStartOffset(month: string): number {
  const [year, m] = month.split("-").map(Number);
  const jsDay = new Date(year, m - 1, 1).getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function CalendarHeatmap({ days, month, milestones = [] }: Props) {
  const offset = getMonthStartOffset(month);
  const cellWidth = `${100 / 7}%`;

  const milestoneMap = new Map<string, Set<"milestone" | "win">>();
  milestones.forEach((m) => {
    if (!m.date.startsWith(month)) return;
    const set = milestoneMap.get(m.date) ?? new Set<"milestone" | "win">();
    set.add(m.category);
    milestoneMap.set(m.date, set);
  });

  return (
    <View className="mx-4 mb-4 bg-surface border border-border rounded-2xl p-4">
      <Text className="text-base font-semibold mb-3" style={{ color: "#2D2D2D" }}>
        {month} Activity
      </Text>
      <View className="flex-row mb-2">
        {DAY_LABELS.map((d, i) => (
          <View key={i} style={{ width: cellWidth }}>
            <Text className="text-center text-xs font-semibold" style={{ color: "#A0A0A0" }}>
              {d}
            </Text>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {Array.from({ length: offset }).map((_, i) => (
          <View key={`pad-${i}`} style={{ width: cellWidth, aspectRatio: 1 }} />
        ))}
        {days.map((day) => {
          const dayNum = parseInt(day.date.split("-")[2], 10);
          const cats = milestoneMap.get(day.date);
          const hasMilestone = cats?.has("milestone") ?? false;
          const hasWin = cats?.has("win") ?? false;
          const hasEvent = hasMilestone || hasWin;
          const isLight = day.status === "future" || day.status === "missed";
          const textColor = isLight ? "#C0B8B0" : "rgba(255,255,255,0.80)";
          const indicatorColor = isLight ? "#9B8FA0" : "rgba(255,255,255,0.95)";

          return (
            <View key={day.date} style={{ width: cellWidth, aspectRatio: 1, padding: 2 }}>
              <View
                className="rounded-sm flex-1"
                style={{
                  backgroundColor: statusColor(day.status),
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 3,
                  paddingBottom: 2,
                }}
              >
                <Text style={{ fontSize: 10, color: textColor, fontWeight: "600", lineHeight: 12 }}>
                  {dayNum}
                </Text>
                {hasEvent ? (
                  <Text style={{ fontSize: 7, color: indicatorColor, lineHeight: 8 }}>
                    {hasMilestone && hasWin ? "◆★" : hasMilestone ? "◆" : "★"}
                  </Text>
                ) : (
                  <View style={{ height: 8 }} />
                )}
              </View>
            </View>
          );
        })}
      </View>
      <View className="flex-row gap-3 mt-3 flex-wrap">
        {[
          { label: "Complete", color: Colors.success, symbol: null },
          { label: "Rest", color: Colors.rest, symbol: null },
          { label: "Partial", color: Colors.warning, symbol: null },
        ].map((item) => (
          <View key={item.label} className="flex-row items-center gap-1">
            <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <Text className="text-xs" style={{ color: "#6B6B6B" }}>{item.label}</Text>
          </View>
        ))}
        <View className="flex-row items-center gap-1">
          <Text style={{ fontSize: 10, color: "#6B7280" }}>◆</Text>
          <Text className="text-xs" style={{ color: "#6B6B6B" }}>Milestone</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text style={{ fontSize: 10, color: "#6B7280" }}>★</Text>
          <Text className="text-xs" style={{ color: "#6B6B6B" }}>Win</Text>
        </View>
      </View>
    </View>
  );
}
