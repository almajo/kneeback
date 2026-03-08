import { View, Text } from "react-native";
import { Colors } from "../constants/colors";

interface Props {
  activationDays: Set<string>; // Set of date strings where quad fired
  last30: string[]; // Array of last 30 date strings
}

export function QuadStreak({ activationDays, last30 }: Props) {
  return (
    <View className="mx-4 mb-4 bg-surface border border-border rounded-2xl p-4">
      <Text className="text-base font-semibold mb-3" style={{ color: "#2D2D2D" }}>
        Quad Activation (last 30 days)
      </Text>
      <View className="flex-row flex-wrap gap-1">
        {last30.map((date) => (
          <View
            key={date}
            className="w-6 h-6 rounded-full"
            style={{
              backgroundColor: activationDays.has(date) ? Colors.success : Colors.borderLight,
            }}
          />
        ))}
      </View>
      <Text className="text-xs mt-2" style={{ color: "#A0A0A0" }}>
        Green = quad fired that day
      </Text>
    </View>
  );
}
