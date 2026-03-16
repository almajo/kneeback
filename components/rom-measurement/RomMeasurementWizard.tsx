import { useState, useCallback } from "react";
import { Modal, View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useImuMeasurement } from "@/lib/hooks/use-imu-measurement";
import { PositionStep } from "./PositionStep";
import { CalibrationStep } from "./CalibrationStep";
import { MeasurementStep } from "./MeasurementStep";
import { MeasurementReview } from "./MeasurementReview";
import type { RomMeasurement } from "@/lib/types";

type Step = "position" | "calibrate" | "flexion" | "review";

interface Props {
  visible: boolean;
  onComplete: (result: { flexionDegrees: number }) => void;
  onDismiss: () => void;
  lastMeasurement?: RomMeasurement | null;
}

const STEPS: Step[] = ["position", "calibrate", "flexion", "review"];
const STEP_LABELS: Record<Step, string> = {
  position: "Position",
  calibrate: "Calibrate",
  flexion: "Measure",
  review: "Review",
};

export function RomMeasurementWizard({ visible, onComplete, onDismiss, lastMeasurement }: Props) {
  const [step, setStep] = useState<Step>("position");
  const [flexionDegrees, setFlexionDegrees] = useState<number | null>(null);
  const imu = useImuMeasurement();

  function handleDismiss() {
    imu.reset();
    setStep("position");
    setFlexionDegrees(null);
    onDismiss();
  }

  function handleRetake() {
    imu.reset();
    setStep("calibrate");
    setFlexionDegrees(null);
  }

  function handleSave() {
    if (flexionDegrees === null) return;
    imu.reset();
    setStep("position");
    setFlexionDegrees(null);
    onComplete({ flexionDegrees });
  }

  // Stable reference required by MeasurementStep's useEffect dep array
  const handleCaptured = useCallback((degrees: number) => {
    setFlexionDegrees(degrees);
    setStep("review");
  }, []);

  const stepIndex = STEPS.indexOf(step);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleDismiss}>
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={handleDismiss} className="p-1">
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text className="font-semibold text-base" style={{ color: Colors.text }}>
            Measure ROM
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Step indicator */}
        <View className="flex-row px-6 pt-4 pb-2 gap-2">
          {STEPS.map((s, i) => (
            <View key={s} className="flex-1 items-center gap-1">
              <View
                className="w-full h-1 rounded-full"
                style={{
                  backgroundColor:
                    i < stepIndex ? Colors.success :
                    i === stepIndex ? Colors.primary :
                    Colors.border,
                }}
              />
              <Text
                className="text-xs"
                style={{ color: i <= stepIndex ? Colors.text : Colors.textMuted }}
              >
                {STEP_LABELS[s]}
              </Text>
            </View>
          ))}
        </View>

        {step === "position" && <PositionStep onReady={() => setStep("calibrate")} />}
        {step === "calibrate" && <CalibrationStep imu={imu} onCalibrated={() => setStep("flexion")} />}
        {step === "flexion" && <MeasurementStep imu={imu} onCaptured={handleCaptured} />}
        {step === "review" && flexionDegrees !== null && (
          <MeasurementReview
            flexionDegrees={flexionDegrees}
            lastMeasurement={lastMeasurement}
            onSave={handleSave}
            onRetake={handleRetake}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
