import { View, Text } from "react-native";

interface Props {
  message: string | null;
}

export function DailyMessage({ message }: Props) {
  if (!message) return null;
  return (
    <View className="bg-surface-alt rounded-2xl px-5 py-4 mx-4 mb-4">
      <Text className="text-base italic text-center" style={{ color: "#2D2D2D" }}>{message}</Text>
    </View>
  );
}
