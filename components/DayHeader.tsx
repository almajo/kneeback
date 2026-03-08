import { View, Text } from "react-native";

interface Props {
  day: number;
  week: number;
}

export function DayHeader({ day, week }: Props) {
  return (
    <View className="items-center py-6 mx-4 mb-2 border-b border-border">
      <Text className="text-5xl font-bold text-primary">Day {day}</Text>
      <Text className="text-base mt-1" style={{ color: "#6B6B6B" }}>Week {week} of recovery</Text>
    </View>
  );
}
