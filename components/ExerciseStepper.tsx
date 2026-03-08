import { View, Text, TouchableOpacity } from "react-native";
import { Colors } from "../constants/colors";

interface ExerciseStepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function ExerciseStepper({ label, value, min = 1, max = 20, step = 1, unit, onChange }: ExerciseStepperProps) {
  function decrement() {
    if (value - step >= min) onChange(value - step);
  }
  function increment() {
    if (value + step <= max) onChange(value + step);
  }

  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm font-medium" style={{ color: "#2D2D2D" }}>{label}</Text>
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={decrement}
          disabled={value - step < min}
          className="w-8 h-8 rounded-full bg-surface border border-border items-center justify-center"
          style={{ opacity: value - step < min ? 0.4 : 1 }}
        >
          <Text className="text-base font-bold" style={{ color: Colors.primary }}>−</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold w-10 text-center" style={{ color: "#2D2D2D" }}>
          {value}{unit}
        </Text>
        <TouchableOpacity
          onPress={increment}
          disabled={value + step > max}
          className="w-8 h-8 rounded-full bg-surface border border-border items-center justify-center"
          style={{ opacity: value + step > max ? 0.4 : 1 }}
        >
          <Text className="text-base font-bold" style={{ color: Colors.primary }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
