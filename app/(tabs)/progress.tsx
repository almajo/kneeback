import { View, Text } from "react-native";
export default function ProgressScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-2xl font-bold" style={{ color: "#2D2D2D" }}>Progress</Text>
      <Text style={{ color: "#6B6B6B" }}>Coming soon</Text>
    </View>
  );
}
