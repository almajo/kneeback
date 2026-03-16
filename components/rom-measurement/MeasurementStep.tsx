import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import type { ImuMeasurementState } from "@/lib/hooks/use-imu-measurement";

interface Props {
  imu: ImuMeasurementState;
  // onCaptured must be a stable reference (wrap in useCallback at the call site)
  onCaptured: (degrees: number) => void;
}

export function MeasurementStep({ imu, onCaptured }: Props) {
  // Start measuring on mount, stop on unmount
  // Intentionally omitting imu from deps: we want mount/unmount semantics only.
  // The imu object identity may change on re-render but we only start once.
  useEffect(() => {
    imu.startMeasurement();
    return () => {
      imu.stopMeasurement();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire haptic and advance when auto-capture locks
  // onCaptured is listed as a dep — callers must pass a stable reference.
  useEffect(() => {
    if (imu.isLocked && imu.peakAngle !== null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const timer = setTimeout(() => onCaptured(imu.peakAngle!), 600);
      return () => clearTimeout(timer);
    }
  }, [imu.isLocked, imu.peakAngle, onCaptured]);

  const progressPercent = Math.round(imu.stableProgress * 100);

  return (
    <View className="flex-1 px-6 pt-10 pb-10 justify-between">
      <View className="items-center">
        <Text className="text-2xl font-bold mb-2" style={{ color: Colors.text }}>
          Bend your knee
        </Text>
        <Text className="text-base mb-10 text-center" style={{ color: Colors.textSecondary }}>
          Slowly slide your heel toward your glutes. Hold at your maximum — the angle locks automatically.
        </Text>

        {/* Live angle readout */}
        <View
          className="w-52 h-52 rounded-full items-center justify-center mb-8"
          style={{
            borderWidth: 6,
            borderColor: imu.isLocked ? Colors.success : Colors.primary,
            backgroundColor: Colors.surface,
          }}
        >
          {imu.isLocked ? (
            <View className="items-center gap-1">
              <Ionicons name="checkmark-circle" size={36} color={Colors.success} />
              <Text className="text-5xl font-bold" style={{ color: Colors.success }}>
                {imu.peakAngle}°
              </Text>
              <Text className="text-xs" style={{ color: Colors.success }}>Locked</Text>
            </View>
          ) : (
            <View className="items-center">
              <Text className="text-6xl font-bold" style={{ color: Colors.text }}>
                {imu.currentAngle}°
              </Text>
              <Text className="text-xs mt-1" style={{ color: Colors.textMuted }}>flexion</Text>
            </View>
          )}
        </View>

        {/* Stability progress bar */}
        {!imu.isLocked && (
          <View className="w-full">
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs" style={{ color: Colors.textMuted }}>Hold still to lock</Text>
              <Text className="text-xs" style={{ color: Colors.textMuted }}>{progressPercent}%</Text>
            </View>
            <View className="w-full h-2 rounded-full" style={{ backgroundColor: Colors.border }}>
              <View
                className="h-2 rounded-full"
                style={{ width: `${progressPercent}%`, backgroundColor: Colors.primary }}
              />
            </View>
          </View>
        )}
      </View>

      {/* "Capture now" manual fallback — appears after 10 seconds */}
      {imu.showCaptureNow && !imu.isLocked && (
        <TouchableOpacity
          className="py-4 rounded-2xl items-center border"
          style={{ borderColor: Colors.border, backgroundColor: Colors.surface }}
          onPress={imu.captureNow}
        >
          <Text className="font-semibold" style={{ color: Colors.text }}>
            Capture now ({imu.currentAngle}°)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
