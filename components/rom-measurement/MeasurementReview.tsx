import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import type { LocalRomMeasurement } from "@/lib/db/repositories/rom-repo";

interface Props {
  flexionDegrees: number;
  lastMeasurement?: LocalRomMeasurement | null;
  onSave: () => void;
  onRetake: () => void;
}

export function MeasurementReview({
  flexionDegrees,
  lastMeasurement,
  onSave,
  onRetake,
}: Props) {
  const lastFlexion = lastMeasurement?.flexion_degrees ?? null;
  const delta = lastFlexion !== null ? flexionDegrees - lastFlexion : null;

  return (
    <View className="flex-1 px-6 pt-10 pb-10 justify-between">
      <View>
        <Text className="text-2xl font-bold mb-2" style={{ color: Colors.text }}>
          Measurement complete
        </Text>
        <Text className="text-base mb-8" style={{ color: Colors.textSecondary }}>
          Save to log it, or retake if something felt off.
        </Text>

        <View
          className="rounded-2xl p-6 items-center mb-4"
          style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }}
        >
          <Text className="text-xs font-semibold tracking-wide mb-1" style={{ color: Colors.textMuted }}>
            FLEXION
          </Text>
          <Text className="text-6xl font-bold mb-1" style={{ color: Colors.text }}>
            {flexionDegrees}°
          </Text>

          {delta !== null && (
            <View className="flex-row items-center gap-1 mt-1">
              <Ionicons
                name={delta >= 0 ? "arrow-up" : "arrow-down"}
                size={14}
                color={delta >= 0 ? Colors.success : Colors.error}
              />
              <Text
                className="text-sm font-semibold"
                style={{ color: delta >= 0 ? Colors.success : Colors.error }}
              >
                {Math.abs(delta)}° vs last time
              </Text>
            </View>
          )}
        </View>

        <Text className="text-xs text-center" style={{ color: Colors.textMuted }}>
          Extension saved as 0° (your personal full-extension baseline).
        </Text>
      </View>

      <View className="gap-3">
        <TouchableOpacity
          className="py-4 rounded-2xl items-center"
          style={{ backgroundColor: Colors.primary }}
          onPress={onSave}
        >
          <Text className="text-white font-bold text-base">Save measurement</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="py-4 rounded-2xl items-center border"
          style={{ borderColor: Colors.border, backgroundColor: Colors.surface }}
          onPress={onRetake}
        >
          <Text className="font-semibold" style={{ color: Colors.textSecondary }}>Retake</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
