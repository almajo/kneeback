import { View, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";

interface Props {
  current: number;
  total: number;
  onSetComplete: (sets: number) => void;
}

export function SetTracker({ current, total, onSetComplete }: Props) {
  function toggleSet(index: number) {
    const newSets = index < current ? index : index + 1;
    onSetComplete(newSets);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View className="flex-row justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <TouchableOpacity
          key={i}
          className={`w-8 h-8 rounded-full border-2 items-center justify-center ${
            i < current ? "bg-primary border-primary" : "bg-transparent border-border"
          }`}
          onPress={() => toggleSet(i)}
        />
      ))}
    </View>
  );
}
