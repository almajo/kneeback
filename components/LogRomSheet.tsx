import { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import type { LocalRomMeasurement } from "../lib/db/repositories/rom-repo";
import { RomMeasurementWizard } from "./rom-measurement/RomMeasurementWizard";
import { useImuMeasurement } from "../lib/hooks/use-imu-measurement";

interface SavePayload {
  date: string;
  flexion_degrees: number | null;
  extension_degrees: number | null;
  quad_activation: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
  editingEntry?: LocalRomMeasurement | null;
  lastMeasurement?: LocalRomMeasurement | null;
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function displayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function LogRomSheet({ visible, onClose, onSave, editingEntry, lastMeasurement }: Props) {
  const [date, setDate] = useState(toDateString(new Date()));
  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [flexion, setFlexion] = useState("");
  const [extension, setExtension] = useState("");
  const [quadActivation, setQuadActivation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);
  const { isAvailable } = useImuMeasurement();

  useEffect(() => {
    if (editingEntry) {
      setDate(editingEntry.date);
      const [year, month, day] = editingEntry.date.split("-").map(Number);
      setDateObj(new Date(year, month - 1, day));
      setFlexion(editingEntry.flexion_degrees?.toString() ?? "");
      setExtension(editingEntry.extension_degrees?.toString() ?? "");
      setQuadActivation(editingEntry.quad_activation);
    } else {
      const now = new Date();
      setDate(toDateString(now));
      setDateObj(now);
      setFlexion("");
      setExtension("");
      setQuadActivation(false);
    }
  }, [editingEntry, visible]);

  function handleClose() {
    setSaving(false);
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    await onSave({
      date,
      flexion_degrees: flexion ? parseInt(flexion, 10) : null,
      extension_degrees: extension ? parseInt(extension, 10) : null,
      quad_activation: quadActivation,
    });
    setSaving(false);
    onClose();
  }

  const isEditing = !!editingEntry;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={handleClose}
        />
        <View
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          className="bg-background rounded-t-3xl px-6 pt-4 pb-10"
        >
          {/* Handle */}
          <View className="w-10 h-1 rounded-full bg-border self-center mb-5" />

          <Text className="text-xl font-bold mb-4" style={{ color: Colors.text }}>
            {isEditing ? "Edit Measurement" : "Log ROM"}
          </Text>

          {/* Date */}
          <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
            DATE
          </Text>
          {Platform.OS === "web" ? (
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (e.target.value) {
                  const [y, mo, d] = e.target.value.split("-").map(Number);
                  setDateObj(new Date(y, mo - 1, d));
                }
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 16,
                border: `1px solid ${Colors.border}`,
                borderRadius: 16,
                marginBottom: 16,
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: Colors.surface,
                color: Colors.text,
              }}
            />
          ) : (
            <View className="mb-4">
              <TouchableOpacity
                className="bg-surface border border-border rounded-2xl px-4 py-3 flex-row items-center justify-between"
                onPress={() => setShowDatePicker(true)}
              >
                <Text className="text-base" style={{ color: Colors.text }}>{displayDate(date)}</Text>
                <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateObj}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(_, selected) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (selected) {
                      setDateObj(selected);
                      setDate(toDateString(selected));
                    }
                  }}
                />
              )}
              {showDatePicker && Platform.OS === "ios" && (
                <TouchableOpacity
                  className="bg-primary rounded-xl py-3 items-center mt-2"
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text className="text-white font-semibold">Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Sensor button — only shown on devices with IMU hardware */}
          {isAvailable && (
            <>
              <RomMeasurementWizard
                visible={wizardVisible}
                lastMeasurement={lastMeasurement}
                onComplete={({ flexionDegrees }) => {
                  setFlexion(String(flexionDegrees));
                  setExtension("0");
                  setWizardVisible(false);
                }}
                onDismiss={() => setWizardVisible(false)}
              />
              <TouchableOpacity
                className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-primary mb-4"
                style={{ backgroundColor: Colors.primary + "12" }}
                onPress={() => setWizardVisible(true)}
              >
                <Ionicons name="phone-portrait-outline" size={18} color={Colors.primary} />
                <Text className="font-semibold" style={{ color: Colors.primary }}>
                  Use Phone Sensor
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Flexion + Extension */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
                FLEXION (°)
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-2xl px-4 py-3 text-base"
                style={{ color: Colors.text }}
                value={flexion}
                onChangeText={setFlexion}
                placeholder="e.g. 90"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
                EXTENSION (°)
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-2xl px-4 py-3 text-base"
                style={{ color: Colors.text }}
                value={extension}
                onChangeText={setExtension}
                placeholder="e.g. 5"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Quad activation */}
          <View className="flex-row items-center justify-between mb-6 bg-surface border border-border rounded-2xl px-4 py-3">
            <Text className="text-base font-medium" style={{ color: Colors.text }}>Quad fired today?</Text>
            <Switch
              value={quadActivation}
              onValueChange={setQuadActivation}
              trackColor={{ true: Colors.success }}
            />
          </View>

          {/* Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 py-4 rounded-2xl border border-border items-center"
              style={{ backgroundColor: Colors.surface }}
              onPress={handleClose}
            >
              <Text style={{ color: Colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-4 rounded-2xl items-center"
              style={{ backgroundColor: Colors.primary, opacity: saving ? 0.6 : 1 }}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  {isEditing ? "Update" : "Save"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
