import { View, Text, TouchableOpacity } from "react-native";
import { Colors } from "../constants/colors";

interface ExerciseStepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  variableStep?: boolean;
  unit?: string;
  onChange: (value: number) => void;
}

function getStep(value: number, direction: "up" | "down", variableStep: boolean): number {
  if (!variableStep) return 1;
  if (direction === "up") return value < 10 ? 1 : 5;
  // decrement: if we're at a value >10 and it's a multiple of 5, step by 5; if <=10, step by 1
  return value > 10 ? 5 : 1;
}

export function ExerciseStepper({ label, value, min = 1, max = 20, step = 1, variableStep = false, unit, onChange }: ExerciseStepperProps) {
  function decrement() {
    const s = variableStep ? getStep(value, "down", true) : step;
    if (value - s >= min) onChange(value - s);
  }
  function increment() {
    const s = variableStep ? getStep(value, "up", true) : step;
    if (value + s <= max) onChange(value + s);
  }

  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm font-medium" style={{ color: "#2D2D2D" }}>{label}</Text>
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={decrement}
          disabled={value <= min}
          className="w-8 h-8 rounded-full bg-surface border border-border items-center justify-center"
          style={{ opacity: value <= min ? 0.4 : 1 }}
        >
          <Text className="text-base font-bold" style={{ color: Colors.primary }}>−</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold w-10 text-center" style={{ color: "#2D2D2D" }}>
          {value}{unit}
        </Text>
        <TouchableOpacity
          onPress={increment}
          disabled={value >= max}
          className="w-8 h-8 rounded-full bg-surface border border-border items-center justify-center"
          style={{ opacity: value >= max ? 0.4 : 1 }}
        >
          <Text className="text-base font-bold" style={{ color: Colors.primary }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
