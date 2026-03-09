import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";

interface Props {
  seconds: number;
  onTimerComplete?: () => void;
}

export function RestTimer({ seconds, onTimerComplete }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            onTimerComplete?.();
            setRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          if (prev >= 2 && prev <= 4) {
            Speech.speak(String(prev - 1), { rate: 1.2 });
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining, onTimerComplete]);

  function toggle() {
    if (remaining === 0) {
      setRemaining(seconds);
      setRunning(true);
    } else {
      if (running) Speech.stop();
      setRunning(!running);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  const buttonColor = remaining === 0 ? "bg-secondary" : running ? "bg-warning" : "bg-primary";
  const buttonLabel = remaining === 0 ? "Reset" : running ? "Pause" : "Start";

  return (
    <View className="items-center mt-3">
      <Text className="text-3xl font-bold" style={{ color: "#2D2D2D" }}>{display}</Text>
      <TouchableOpacity
        className={`mt-2 px-6 py-2 rounded-2xl ${buttonColor}`}
        onPress={toggle}
      >
        <Text className="text-white font-bold">{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
