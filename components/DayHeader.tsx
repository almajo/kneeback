import { View, Text } from "react-native";

interface Props {
  day: number;
  week: number;
}

export function DayHeader({ day, week }: Props) {
  return (
    <View className="items-center py-4">
      <Text className="text-5xl font-bold text-primary">Day {day}</Text>
      <Text className="text-base mt-1" style={{ color: "#6B6B6B" }}>Week {week}</Text>
    </View>
  );
}
