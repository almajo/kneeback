import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { Colors } from "@/constants/colors";
import type { ImuMeasurementState } from "@/lib/hooks/use-imu-measurement";

interface Props {
  imu: ImuMeasurementState;
  onCalibrated: () => void;
}

type Phase = "thigh-idle" | "thigh-calibrating" | "thigh-success" | "thigh-failed"
           | "shin-idle"  | "shin-calibrating"  | "shin-success"  | "shin-failed";

export function CalibrationStep({ imu, onCalibrated }: Props) {
  const [phase, setPhase] = useState<Phase>("thigh-idle");

  async function handleCalibrateThigh() {
    setPhase("thigh-calibrating");
    const result = await imu.calibrateThigh();

    if (result === "success") {
      setPhase("thigh-success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Speech.speak("Move phone to shin", { rate: 1.1 });
      setTimeout(() => setPhase("shin-idle"), 1200);
    } else {
      setPhase("thigh-failed");
      if (Platform.OS !== "web") {
        Alert.alert(
          "Calibration failed",
          "Keep your leg flat and hold the phone still, then try again."
        );
      }
    }
  }

  async function handleCalibrateShin() {
    setPhase("shin-calibrating");
    const result = await imu.calibrate();

    if (result === "success") {
      setPhase("shin-success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Speech.speak("Ready. Bend your knee.", { rate: 1.1 });
      setTimeout(onCalibrated, 1200);
    } else {
      setPhase("shin-failed");
      if (Platform.OS !== "web") {
        Alert.alert(
          "Calibration failed",
          "Keep your leg flat and hold the phone still, then try again."
        );
      }
    }
  }

  const isThighPhase = phase.startsWith("thigh");
  const stepLabel = isThighPhase ? "Step 1 of 2 — Thigh" : "Step 2 of 2 — Shin";
  const instruction = isThighPhase
    ? "Place phone flat on your thigh, screen facing up. Hold your leg perfectly still."
    : "Move phone to your shin, screen facing up. Hold your leg perfectly still.";
  const isCalibrating = phase === "thigh-calibrating" || phase === "shin-calibrating";
  const isSuccess = phase === "thigh-success" || phase === "shin-success";
  const isFailed = phase === "thigh-failed" || phase === "shin-failed";

  function handleCalibrate() {
    if (isThighPhase) {
      handleCalibrateThigh();
    } else {
      handleCalibrateShin();
    }
  }

  return (
    <View className="flex-1 px-6 pt-10 pb-10 justify-between">
      <View>
        <Text className="text-2xl font-bold mb-1" style={{ color: Colors.text }}>
          Calibrate
        </Text>
        <Text className="text-sm font-semibold mb-2" style={{ color: Colors.primary }}>
          {stepLabel}
        </Text>
        <Text className="text-base mb-8" style={{ color: Colors.textSecondary }}>
          {instruction}
        </Text>

        <View
          className="rounded-2xl p-6 items-center justify-center"
          style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 140 }}
        >
          {(phase === "thigh-idle" || phase === "shin-idle") && (
            <View className="items-center gap-3">
              <Ionicons name="radio-button-off-outline" size={48} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted }}>Hold still, then tap Calibrate</Text>
            </View>
          )}
          {isCalibrating && (
            <View className="items-center gap-3">
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ color: Colors.textSecondary }}>Measuring baseline…</Text>
            </View>
          )}
          {isSuccess && (
            <View className="items-center gap-3">
              <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
              <Text className="font-semibold" style={{ color: Colors.success }}>Calibrated!</Text>
            </View>
          )}
          {isFailed && (
            <View className="items-center gap-3">
              <Ionicons name="warning-outline" size={48} color={Colors.error} />
              <Text className="text-center" style={{ color: Colors.textSecondary }}>
                Movement detected. Hold still and try again.
              </Text>
            </View>
          )}
        </View>
      </View>

      {!isSuccess && (
        <TouchableOpacity
          className="py-4 rounded-2xl items-center"
          style={{
            backgroundColor: isCalibrating ? Colors.surface : Colors.primary,
            borderWidth: isCalibrating ? 1 : 0,
            borderColor: Colors.border,
          }}
          onPress={handleCalibrate}
          disabled={isCalibrating}
        >
          <Text
            className="font-bold text-base"
            style={{ color: isCalibrating ? Colors.textMuted : "white" }}
          >
            {isFailed ? "Try Again" : "Calibrate"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
