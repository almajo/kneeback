import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import type { RomMeasurement } from "../../lib/types";

export default function MeasurementsScreen() {
  const { session } = useAuth();
  const [measurements, setMeasurements] = useState<RomMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [flexion, setFlexion] = useState("");
  const [extension, setExtension] = useState("");
  const [quadActivation, setQuadActivation] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const userId = session?.user.id;

  async function fetchMeasurements() {
    if (!userId) return;
    const { data } = await supabase
      .from("rom_measurements")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    setMeasurements((data as RomMeasurement[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchMeasurements();
  }, [userId]);

  function resetForm() {
    setDate(new Date().toISOString().split("T")[0]);
    setFlexion("");
    setExtension("");
    setQuadActivation(false);
    setEditingId(null);
  }

  function startEdit(m: RomMeasurement) {
    setEditingId(m.id);
    setDate(m.date);
    setFlexion(m.flexion_degrees?.toString() ?? "");
    setExtension(m.extension_degrees?.toString() ?? "");
    setQuadActivation(m.quad_activation);
  }

  async function saveMeasurement() {
    if (!userId) return;
    setSaving(true);

    const payload = {
      user_id: userId,
      date,
      flexion_degrees: flexion ? parseInt(flexion, 10) : null,
      extension_degrees: extension ? parseInt(extension, 10) : null,
      quad_activation: quadActivation,
    };

    if (editingId) {
      const { error } = await supabase
        .from("rom_measurements")
        .update(payload)
        .eq("id", editingId);
      if (error) Alert.alert("Error", error.message);
    } else {
      const { error } = await supabase.from("rom_measurements").insert(payload);
      if (error) Alert.alert("Error", error.message);
    }

    await fetchMeasurements();
    resetForm();
    setSaving(false);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 40 }}>
      {/* Form */}
      <View className="bg-surface border border-border rounded-2xl p-4 mb-6">
        <Text className="text-base font-semibold mb-3" style={{ color: "#2D2D2D" }}>
          {editingId ? "Edit Entry" : "Log Today's ROM"}
        </Text>

        <Text className="text-sm mb-1" style={{ color: "#6B6B6B" }}>Date</Text>
        <TextInput
          className="border border-border rounded-xl px-3 py-3 text-base mb-3 bg-background"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <Text className="text-sm mb-1" style={{ color: "#6B6B6B" }}>Flexion (°)</Text>
            <TextInput
              className="border border-border rounded-xl px-3 py-3 text-base bg-background"
              value={flexion}
              onChangeText={setFlexion}
              placeholder="e.g. 90"
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm mb-1" style={{ color: "#6B6B6B" }}>Extension (°)</Text>
            <TextInput
              className="border border-border rounded-xl px-3 py-3 text-base bg-background"
              value={extension}
              onChangeText={setExtension}
              placeholder="e.g. 5"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base font-semibold" style={{ color: "#2D2D2D" }}>Quad fired today?</Text>
          <Switch
            value={quadActivation}
            onValueChange={setQuadActivation}
            trackColor={{ true: Colors.success }}
          />
        </View>

        <View className="flex-row gap-3">
          {editingId && (
            <TouchableOpacity
              className="flex-1 py-3 rounded-2xl border border-border items-center"
              onPress={resetForm}
            >
              <Text style={{ color: "#6B6B6B" }}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className={`flex-1 bg-primary py-3 rounded-2xl items-center ${saving ? "opacity-50" : ""}`}
            onPress={saveMeasurement}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold">{editingId ? "Update" : "Save"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* History */}
      <Text className="text-base font-semibold mb-3" style={{ color: "#2D2D2D" }}>History</Text>

      {measurements.length === 0 ? (
        <View className="bg-surface border border-border rounded-2xl p-6 items-center">
          <Text className="text-base text-center" style={{ color: "#6B6B6B" }}>
            No measurements yet. Log your first ROM reading above.
          </Text>
        </View>
      ) : (
        measurements.map((m) => (
          <TouchableOpacity
            key={m.id}
            className="bg-surface border border-border rounded-2xl p-4 mb-3 flex-row items-center"
            onPress={() => startEdit(m)}
          >
            <View className="flex-1">
              <Text className="text-sm font-semibold mb-1" style={{ color: "#A0A0A0" }}>{m.date}</Text>
              <View className="flex-row gap-4">
                {m.flexion_degrees !== null && (
                  <Text className="text-base font-bold" style={{ color: Colors.primary }}>
                    Flex {m.flexion_degrees}°
                  </Text>
                )}
                {m.extension_degrees !== null && (
                  <Text className="text-base font-bold" style={{ color: Colors.secondary }}>
                    Ext {m.extension_degrees}°
                  </Text>
                )}
                {m.quad_activation && (
                  <Text className="text-base" style={{ color: Colors.success }}>⚡ Quad</Text>
                )}
              </View>
            </View>
            <Ionicons name="pencil-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
