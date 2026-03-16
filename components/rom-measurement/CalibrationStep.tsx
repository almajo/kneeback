import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import type { ImuMeasurementState } from "@/lib/hooks/use-imu-measurement";

interface Props {
  imu: ImuMeasurementState;
  onCalibrated: () => void;
}

export function CalibrationStep({ imu, onCalibrated }: Props) {
  const [status, setStatus] = useState<"idle" | "calibrating" | "success" | "failed">("idle");

  async function handleCalibrate() {
    setStatus("calibrating");
    const result = await imu.calibrate();

    if (result === "success") {
      setStatus("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(onCalibrated, 600);
    } else {
      setStatus("failed");
      if (Platform.OS !== "web") {
        Alert.alert(
          "Calibration failed",
          "Keep your leg flat and hold the phone still, then try again."
        );
      }
    }
  }

  return (
    <View className="flex-1 px-6 pt-10 pb-10 justify-between">
      <View>
        <Text className="text-2xl font-bold mb-2" style={{ color: Colors.text }}>
          Calibrate
        </Text>
        <Text className="text-base mb-8" style={{ color: Colors.textSecondary }}>
          Keep your leg flat and hold perfectly still. The app will lock in your straight-leg position as the reference point (0°).
        </Text>

        <View
          className="rounded-2xl p-6 items-center justify-center"
          style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 140 }}
        >
          {status === "idle" && (
            <View className="items-center gap-3">
              <Ionicons name="radio-button-off-outline" size={48} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted }}>Hold still, then tap Calibrate</Text>
            </View>
          )}
          {status === "calibrating" && (
            <View className="items-center gap-3">
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ color: Colors.textSecondary }}>Measuring baseline…</Text>
            </View>
          )}
          {status === "success" && (
            <View className="items-center gap-3">
              <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
              <Text className="font-semibold" style={{ color: Colors.success }}>Calibrated!</Text>
            </View>
          )}
          {status === "failed" && (
            <View className="items-center gap-3">
              <Ionicons name="warning-outline" size={48} color={Colors.error} />
              <Text className="text-center" style={{ color: Colors.textSecondary }}>
                Movement detected. Hold still and try again.
              </Text>
            </View>
          )}
        </View>
      </View>

      {status !== "success" && (
        <TouchableOpacity
          className="py-4 rounded-2xl items-center"
          style={{
            backgroundColor: status === "calibrating" ? Colors.surface : Colors.primary,
            borderWidth: status === "calibrating" ? 1 : 0,
            borderColor: Colors.border,
          }}
          onPress={handleCalibrate}
          disabled={status === "calibrating"}
        >
          <Text
            className="font-bold text-base"
            style={{ color: status === "calibrating" ? Colors.textMuted : "white" }}
          >
            {status === "failed" ? "Try Again" : "Calibrate"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
