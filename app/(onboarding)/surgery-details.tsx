import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../lib/onboarding-context";
import { supabase } from "../../lib/supabase";
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

function parseDateSafe(str: string | null): Date {
  if (!str) return new Date();
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function isSurgeryInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

interface FieldErrors {
  name?: string;
  username?: string;
  graftType?: string;
  kneeSide?: string;
}

export default function SurgeryDetails() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const [dateNotSetYet, setDateNotSetYet] = useState(data.surgeryDate === null);
  const [surgeryDate, setSurgeryDate] = useState(parseDateSafe(data.surgeryDate));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [checking, setChecking] = useState(false);
  const [graftNotSure, setGraftNotSure] = useState(false);

  const surgeryInPast = !dateNotSetYet && isSurgeryInPast(surgeryDate);

  function formatDate(d: Date) {
    return d.toISOString().split("T")[0];
  }

  function displayDate(d: Date) {
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  async function handleNext() {
    const newErrors: FieldErrors = {};

    if (!data.name.trim()) {
      newErrors.name = "Please enter your name.";
    }
    if (!data.username.trim()) {
      newErrors.username = "Please enter a username.";
    }
    if (!data.kneeSide) {
      newErrors.kneeSide = "Please select which knee.";
    }
    if (surgeryInPast && !data.graftType && !graftNotSure) {
      newErrors.graftType = 'Please select your graft type, or choose "Not sure".';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Check username availability
    if (data.username.trim()) {
      setChecking(true);
      const { data: existing, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", data.username.trim())
        .maybeSingle();
      setChecking(false);

      if (error) {
        setErrors({ username: "Could not verify username. Please try again." });
        return;
      }
      if (existing) {
        setErrors({ username: "This username is already taken. Please choose another." });
        return;
      }
    }

    setErrors({});
    update({ surgeryDate: dateNotSetYet ? null : formatDate(surgeryDate) });
    router.push('/(onboarding)/quick-setup');
  }

  function toggleDateNotSet() {
    setDateNotSetYet((prev) => {
      if (!prev) {
        update({ surgeryDate: null });
        // If surgery is no longer in the past, clear graft type
        update({ graftType: null });
        setGraftNotSure(false);
      }
      return !prev;
    });
  }

  function handleDateChange(newDate: Date) {
    setSurgeryDate(newDate);
    // Clear graft type selection if date moves to the future
    if (!isSurgeryInPast(newDate)) {
      update({ graftType: null });
      setGraftNotSure(false);
    }
  }

  function clearError(field: keyof FieldErrors) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text className="text-3xl font-bold text-primary mb-2">Let's get started</Text>
      <Text className="text-base mb-8" style={{ color: "#6B6B6B" }}>
        Tell us about your surgery so we can set up your recovery plan.
      </Text>

      {/* Name */}
      <Text className="text-sm font-semibold mb-2" style={{ color: "#2D2D2D" }}>Your Name</Text>
      <TextInput
        className={`bg-surface border rounded-2xl px-4 py-4 text-base mb-1 ${errors.name ? "border-red-400" : "border-border"}`}
        placeholder="First name"
        value={data.name}
        onChangeText={(v) => { update({ name: v }); clearError("name"); }}
        autoCapitalize="words"
        autoFocus
        returnKeyType="next"
      />
      {errors.name && (
        <Text className="text-red-500 text-xs mb-4 ml-1">{errors.name}</Text>
      )}
      {!errors.name && <View className="mb-6" />}

      {/* Username */}
      <Text className="text-sm font-semibold mb-2" style={{ color: "#2D2D2D" }}>Username</Text>
      <TextInput
        className={`bg-surface border rounded-2xl px-4 py-4 text-base mb-1 ${errors.username ? "border-red-400" : "border-border"}`}
        placeholder="Your username"
        value={data.username}
        onChangeText={(v) => { update({ username: v }); clearError("username"); }}
        autoCapitalize="none"
        returnKeyType="next"
      />
      {errors.username && (
        <Text className="text-red-500 text-xs mb-4 ml-1">{errors.username}</Text>
      )}
      {!errors.username && <View className="mb-6" />}

      {/* Surgery Date */}
      <Text className="text-sm font-semibold mb-2" style={{ color: "#2D2D2D" }}>Surgery Date</Text>

      <TouchableOpacity
        className="flex-row items-center gap-3 mb-4"
        onPress={toggleDateNotSet}
        activeOpacity={0.7}
      >
        <View
          className={`w-5 h-5 rounded border-2 items-center justify-center ${
            dateNotSetYet ? "bg-primary border-primary" : "bg-surface border-border"
          }`}
        >
          {dateNotSetYet && <Text className="text-white text-xs font-bold">✓</Text>}
        </View>
        <Text className="text-sm" style={{ color: "#6B6B6B" }}>
          I don't have a surgery date yet
        </Text>
      </TouchableOpacity>

      {!dateNotSetYet && (
        Platform.OS === "web" ? (
          <input
            type="date"
            value={formatDate(surgeryDate)}
            onChange={(e) => {
              if (e.target.value) handleDateChange(new Date(e.target.value + "T12:00:00"));
            }}
            style={{
              width: "100%",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E5E5",
              borderRadius: 16,
              padding: "16px",
              fontSize: 16,
              color: "#2D2D2D",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 24,
            }}
          />
        ) : Platform.OS === "android" ? (
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
                onChange={(_, selected) => {
                  setShowDatePicker(false);
                  if (selected) handleDateChange(selected);
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
              onChange={(_, selected) => {
                if (selected) handleDateChange(selected);
              }}
              style={{ width: "100%" }}
            />
          </View>
        )
      )}

      {dateNotSetYet && (
        <View className="bg-surface border border-border rounded-2xl px-4 py-4 mb-6">
          <Text className="text-sm" style={{ color: "#6B6B6B" }}>
            You can set your surgery date later in your profile once it's scheduled.
          </Text>
        </View>
      )}

      {/* Graft Type — only shown if surgery is in the past */}
      {surgeryInPast && (
        <>
          <Text className="text-sm font-semibold mb-3" style={{ color: "#2D2D2D" }}>Graft Type</Text>
          <View className="flex-row flex-wrap gap-2 mb-1">
            {GRAFT_TYPES.map((g) => (
              <TouchableOpacity
                key={g.value}
                className={`px-5 py-3 rounded-2xl border ${
                  data.graftType === g.value ? "bg-primary border-primary" : "bg-surface border-border"
                }`}
                onPress={() => { update({ graftType: g.value }); setGraftNotSure(false); clearError("graftType"); }}
              >
                <Text
                  className={`font-semibold ${data.graftType === g.value ? "text-white" : ""}`}
                  style={data.graftType !== g.value ? { color: "#2D2D2D" } : undefined}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
            {/* Not sure option */}
            <TouchableOpacity
              className={`px-5 py-3 rounded-2xl border ${
                graftNotSure ? "bg-primary border-primary" : "bg-surface border-border"
              }`}
              onPress={() => {
                update({ graftType: null });
                setGraftNotSure(true);
                clearError("graftType");
              }}
            >
              <Text
                className={`font-semibold ${graftNotSure ? "text-white" : ""}`}
                style={!graftNotSure ? { color: "#2D2D2D" } : undefined}
              >
                Not sure
              </Text>
            </TouchableOpacity>
          </View>
          {errors.graftType && (
            <Text className="text-red-500 text-xs mb-4 ml-1">{errors.graftType}</Text>
          )}
          {!errors.graftType && <View className="mb-6" />}
        </>
      )}

      {/* Knee Side */}
      <Text className="text-sm font-semibold mb-3" style={{ color: "#2D2D2D" }}>Which Knee?</Text>
      <View className="flex-row gap-3 mb-1">
        {KNEE_SIDES.map((s) => (
          <TouchableOpacity
            key={s.value}
            className={`flex-1 py-4 rounded-2xl border items-center ${
              data.kneeSide === s.value ? "bg-primary border-primary" : "bg-surface border-border"
            }`}
            onPress={() => { update({ kneeSide: s.value }); clearError("kneeSide"); }}
          >
            <Text
              className={`font-bold text-base ${data.kneeSide === s.value ? "text-white" : ""}`}
              style={data.kneeSide !== s.value ? { color: "#2D2D2D" } : undefined}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.kneeSide && (
        <Text className="text-red-500 text-xs mb-4 ml-1">{errors.kneeSide}</Text>
      )}
      {!errors.kneeSide && <View className="mb-10" />}

      <TouchableOpacity
        className={`bg-primary rounded-2xl py-4 items-center ${checking ? "opacity-70" : ""}`}
        onPress={handleNext}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">Next →</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
