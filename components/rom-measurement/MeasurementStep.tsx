import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { Colors } from "@/constants/colors";
import type { ImuMeasurementState } from "@/lib/hooks/use-imu-measurement";

function vibrate() {
  if (Platform.OS === "android") {
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

interface Props {
  imu: ImuMeasurementState;
  // onCaptured must be a stable reference (wrap in useCallback at the call site)
  onCaptured: (shinDegrees: number, thighDegrees: number) => void;
}

export function MeasurementStep({ imu, onCaptured }: Props) {
  // Start measuring on mount, stop on unmount.
  // Intentionally omitting imu from deps: we want mount/unmount semantics only.
  useEffect(() => {
    imu.startMeasurement();
    return () => {
      imu.stopMeasurement();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the shin angle locks, announce "hold it" and prompt thigh capture.
  const shinLockedAnnouncedRef = useRef(false);
  useEffect(() => {
    if (imu.isLocked && imu.peakAngle !== null && !shinLockedAnnouncedRef.current) {
      shinLockedAnnouncedRef.current = true;
      vibrate();
      Speech.speak("Hold it. Move phone to your thigh.", { rate: 1.1 });
    }
  }, [imu.isLocked, imu.peakAngle]);

  // When the thigh angle is captured, fire haptic + speech and advance.
  // onCaptured is listed as a dep — callers must pass a stable reference.
  const thighCapturedRef = useRef(false);
  useEffect(() => {
    if (imu.thighAngle !== null && imu.peakAngle !== null && !thighCapturedRef.current) {
      thighCapturedRef.current = true;
      vibrate();
      Speech.speak("Done.", { rate: 1.1 });
      const timer = setTimeout(() => onCaptured(imu.peakAngle!, imu.thighAngle!), 600);
      return () => clearTimeout(timer);
    }
  }, [imu.thighAngle, imu.peakAngle, onCaptured]);

  const progressPercent = Math.round(imu.stableProgress * 100);

  // ─── Thigh capture phase (after shin is locked) ────────────────────────────
  if (imu.isLocked && imu.thighAngle === null) {
    return (
      <View className="flex-1 px-6 pt-10 pb-10 justify-between">
        <View className="items-center">
          <Text className="text-2xl font-bold mb-2" style={{ color: Colors.text }}>
            Hold it!
          </Text>
          <Text className="text-base mb-10 text-center" style={{ color: Colors.textSecondary }}>
            Keep your leg at this angle. Move the phone to your thigh — flat, screen facing up.
          </Text>

          {/* Locked shin angle display */}
          <View
            className="w-52 h-52 rounded-full items-center justify-center mb-8"
            style={{ borderWidth: 6, borderColor: Colors.success, backgroundColor: Colors.surface }}
          >
            <Ionicons name="checkmark-circle" size={36} color={Colors.success} />
            <Text className="text-4xl font-bold mt-1" style={{ color: Colors.success }}>
              {imu.peakAngle}°
            </Text>
            <Text className="text-xs mt-1" style={{ color: Colors.success }}>shin locked</Text>
          </View>

          {imu.isCapturingThigh && (
            <View className="items-center gap-3">
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ color: Colors.textSecondary }}>Hold still…</Text>
            </View>
          )}
        </View>

        {!imu.isCapturingThigh && (
          <TouchableOpacity
            className="py-4 rounded-2xl items-center"
            style={{ backgroundColor: Colors.primary }}
            onPress={imu.captureThigh}
          >
            <Text className="text-white font-bold text-base">Phone is on thigh — capture</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ─── Active shin measurement phase ─────────────────────────────────────────
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
            borderColor: Colors.primary,
            backgroundColor: Colors.surface,
          }}
        >
          <View className="items-center">
            <Text className="text-6xl font-bold" style={{ color: Colors.text }}>
              {imu.currentAngle}°
            </Text>
            <Text className="text-xs mt-1" style={{ color: Colors.textMuted }}>flexion</Text>
          </View>
        </View>

        {/* Stability progress bar */}
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
      </View>

      {/* "Capture now" manual fallback — appears after 10 seconds */}
      {imu.showCaptureNow && (
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
