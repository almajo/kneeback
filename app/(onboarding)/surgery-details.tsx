import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
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

function parseDateSafe(str: string): Date {
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default function SurgeryDetails() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const [surgeryDate, setSurgeryDate] = useState(parseDateSafe(data.surgeryDate));
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === "ios");

  function formatDate(d: Date) {
    return d.toISOString().split("T")[0];
  }

  function displayDate(d: Date) {
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function handleNext() {
    if (!data.name.trim()) {
      Alert.alert("Missing info", "Please enter your name.");
      return;
    }
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
    update({ surgeryDate: formatDate(surgeryDate) });
    router.push("/(onboarding)/pick-exercises");
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text className="text-3xl font-bold text-primary mb-2">Let's get started</Text>
      <Text className="text-base mb-8" style={{ color: "#6B6B6B" }}>
        Tell us about your surgery so we can set up your recovery plan.
      </Text>

      <Text className="text-sm font-semibold mb-2" style={{ color: "#2D2D2D" }}>Your Name</Text>
      <TextInput
        className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-6"
        placeholder="First name"
        value={data.name}
        onChangeText={(v) => update({ name: v })}
        autoCapitalize="words"
        autoFocus
        returnKeyType="next"
      />

      <Text className="text-sm font-semibold mb-2" style={{ color: "#2D2D2D" }}>Username</Text>
      <TextInput
        className="bg-surface border border-border rounded-2xl px-4 py-4 text-base mb-6"
        placeholder="Your nickname or handle"
        value={data.username}
        onChangeText={(v) => update({ username: v })}
        autoCapitalize="none"
        returnKeyType="next"
      />

      <Text className="text-sm font-semibold mb-2" style={{ color: "#2D2D2D" }}>Surgery Date</Text>
      {Platform.OS === "android" ? (
        <>
          <TouchableOpacity
            className="bg-surface border border-border rounded-2xl px-4 py-4 mb-6"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="text-base" style={{ color: "#2D2D2D" }}>{displayDate(surgeryDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={surgeryDate}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, selected) => {
                setShowDatePicker(false);
                if (selected) setSurgeryDate(selected);
              }}
            />
          )}
        </>
      ) : (
        <View className="bg-surface border border-border rounded-2xl px-2 mb-6 items-center">
          <DateTimePicker
            value={surgeryDate}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            onChange={(_, selected) => {
              if (selected) setSurgeryDate(selected);
            }}
            style={{ width: "100%" }}
          />
        </View>
      )}

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
