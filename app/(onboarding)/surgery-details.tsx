import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../lib/onboarding-context";
import type { GraftType, KneeSide } from "../../lib/types";

const GRAFT_TYPES: { value: GraftType; label: string }[] = [
  { value: "patellar", label: "Patellar" },
  { value: "hamstring", label: "Hamstring" },
  { value: "quad", label: "Quad" },
  { value: "allograft", label: "Allograft" },
];

const KNEE_SIDES: { value: KneeSide; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

export default function SurgeryDetails() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const [dateInput, setDateInput] = useState(data.surgeryDate);

  function handleNext() {
    if (!data.username.trim()) {
      Alert.alert("Missing info", "Please enter a username.");
      return;
    }
    if (!data.graftType) {
      Alert.alert("Missing info", "Please select your graft type.");
      return;
    }
    if (!data.kneeSide) {
      Alert.alert("Missing info", "Please select which knee.");
      return;
    }
    update({ surgeryDate: dateInput });
    router.push("/(onboarding)/pick-exercises");
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text className="text-3xl font-bold text-primary mb-2">Let's get started</Text>
      <Text className="text-base mb-8" style={{ color: "#6B6B6B" }}>
        Tell us about your surgery so we can set up your recovery plan.
      </Text>

      <Text className="text-sm font-semibold mb-2" style={{ color: "#2D2D2D" }}>Username</Text>
      <TextInput
        className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-6"
        placeholder="Your name or nickname"
        value={data.username}
        onChangeText={(v) => update({ username: v })}
        autoCapitalize="words"
      />

      <Text className="text-sm font-semibold mb-2" style={{ color: "#2D2D2D" }}>Surgery Date</Text>
      <TextInput
        className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-6"
        placeholder="YYYY-MM-DD"
        value={dateInput}
        onChangeText={setDateInput}
        keyboardType="numbers-and-punctuation"
      />

      <Text className="text-sm font-semibold mb-3" style={{ color: "#2D2D2D" }}>Graft Type</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {GRAFT_TYPES.map((g) => (
          <TouchableOpacity
            key={g.value}
            className={`px-5 py-3 rounded-2xl border ${
              data.graftType === g.value ? "bg-primary border-primary" : "bg-surface border-border"
            }`}
            onPress={() => update({ graftType: g.value })}
          >
            <Text className={`font-semibold ${data.graftType === g.value ? "text-white" : ""}`}
              style={data.graftType !== g.value ? { color: "#2D2D2D" } : undefined}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-semibold mb-3" style={{ color: "#2D2D2D" }}>Which Knee?</Text>
      <View className="flex-row gap-3 mb-10">
        {KNEE_SIDES.map((s) => (
          <TouchableOpacity
            key={s.value}
            className={`flex-1 py-4 rounded-2xl border items-center ${
              data.kneeSide === s.value ? "bg-primary border-primary" : "bg-surface border-border"
            }`}
            onPress={() => update({ kneeSide: s.value })}
          >
            <Text className={`font-bold text-base ${data.kneeSide === s.value ? "text-white" : ""}`}
              style={data.kneeSide !== s.value ? { color: "#2D2D2D" } : undefined}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center" onPress={handleNext}>
        <Text className="text-white font-bold text-lg">Next →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
