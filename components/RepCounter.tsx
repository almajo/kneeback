import { View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";

interface Props {
  current: number;
  target: number;
  onChange: (value: number) => void;
}

export function RepCounter({ current, target, onChange }: Props) {
  function adjust(delta: number) {
    const next = Math.max(0, current + delta);
    onChange(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View className="flex-row items-center justify-center mt-3">
      <TouchableOpacity
        className="bg-primary/10 rounded-full w-10 h-10 items-center justify-center"
        onPress={() => adjust(-1)}
      >
        <Text className="text-primary text-xl font-bold">-</Text>
      </TouchableOpacity>
      <View className="mx-6 items-center">
        <Text className="text-2xl font-bold" style={{ color: "#2D2D2D" }}>{current}</Text>
        <Text className="text-xs" style={{ color: "#6B6B6B" }}>of {target} reps</Text>
      </View>
      <TouchableOpacity
        className="bg-primary/10 rounded-full w-10 h-10 items-center justify-center"
        onPress={() => adjust(1)}
      >
        <Text className="text-primary text-xl font-bold">+</Text>
      </TouchableOpacity>
    </View>
  );
}
