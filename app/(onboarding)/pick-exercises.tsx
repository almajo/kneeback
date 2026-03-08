import { useEffect, useState } from "react";
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useOnboarding } from "../../lib/onboarding-context";
import { ExerciseStepper } from "../../components/ExerciseStepper";
import { Colors } from "../../constants/colors";
import type { Exercise, ExercisePhase } from "../../lib/types";

const PHASES: { key: ExercisePhase; label: string; weekRange: string; unlockDay: number }[] = [
  { key: "acute",           label: "Acute",           weekRange: "Weeks 0–2",  unlockDay: 0  },
  { key: "early_active",    label: "Early Active",    weekRange: "Weeks 2–6",  unlockDay: 14 },
  { key: "strengthening",   label: "Strengthening",   weekRange: "Weeks 6–12", unlockDay: 42 },
  { key: "return_to_sport", label: "Return to Sport", weekRange: "Week 12+",   unlockDay: 84 },
];

function daysSince(dateStr: string): number {
  const surgery = new Date(dateStr);
  const today = new Date();
  return Math.floor((today.getTime() - surgery.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PickExercises() {
  const router = useRouter();
  const { data, toggleExercise, isSelected, updateExerciseValues } = useOnboarding();
  const [exercisesByPhase, setExercisesByPhase] = useState<Record<string, Exercise[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = daysSince(data.surgeryDate);

  useEffect(() => {
    supabase
      .from("exercises")
      .select("*")
      .eq("status", "approved")
      .order("sort_order")
      .then(
        ({ data: exs }) => {
          const grouped: Record<string, Exercise[]> = {};
          for (const ex of (exs as Exercise[] | null) || []) {
            if (!grouped[ex.phase]) grouped[ex.phase] = [];
            grouped[ex.phase].push(ex);
          }
          setExercisesByPhase(grouped);
          setLoading(false);
        },
        () => {
          setError("Could not load exercises. Check your connection.");
          setLoading(false);
        }
      );
  }, []);

  function handleNext() {
    router.push("/(onboarding)/set-reminder");
  }

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-base text-center" style={{ color: "#6B6B6B" }}>{error}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const sections = PHASES.map((phase) => ({
    phase,
    data: exercisesByPhase[phase.key] || [],
    locked: days < phase.unlockDay,
  })).filter((s) => s.data.length > 0 || s.phase.key === "strengthening" || s.phase.key === "return_to_sport");

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-14 pb-4">
        <Text className="text-3xl font-bold text-primary mb-2">Your exercises</Text>
        <Text className="text-base" style={{ color: "#6B6B6B" }}>
          Select the exercises your physio has prescribed. Future phases unlock as you progress.
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        renderSectionHeader={({ section }) => {
          const { phase, locked } = section;
          return (
            <View className="flex-row items-center justify-between py-3 mt-2">
              <View>
                <Text
                  className="font-bold text-base"
                  style={{ color: locked ? "#A0A0A0" : "#2D2D2D" }}
                >
                  {phase.label}
                </Text>
                <Text className="text-xs" style={{ color: "#A0A0A0" }}>
                  {phase.weekRange}
                </Text>
              </View>
              {locked && (
                <View className="bg-surface border border-border rounded-full px-3 py-1">
                  <Text className="text-xs" style={{ color: "#A0A0A0" }}>
                    Unlocks at week {phase.unlockDay / 7}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        renderItem={({ item, section }) => {
          const { locked } = section;
          const selected = isSelected(item.id);
          const selectedEx = data.selectedExercises.find((e) => e.exerciseId === item.id);

          const previewLabel = selectedEx
            ? `${selectedEx.sets} sets × ${selectedEx.hold_seconds ? `${selectedEx.hold_seconds}s hold` : `${selectedEx.reps} reps`}`
            : `${item.default_sets} sets × ${item.default_hold_seconds ? `${item.default_hold_seconds}s hold` : `${item.default_reps} reps`}`;

          return (
            <TouchableOpacity
              className={`mb-3 rounded-2xl border ${
                locked
                  ? "bg-surface border-border opacity-40"
                  : selected
                  ? "bg-primary/10 border-primary"
                  : "bg-surface border-border"
              }`}
              onPress={() => !locked && toggleExercise(item)}
              disabled={locked}
              activeOpacity={0.8}
            >
              <View className="flex-row items-start p-4">
                <Ionicons
                  name={selected && !locked ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={selected && !locked ? Colors.primary : Colors.textMuted}
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View className="flex-1">
                  <Text className="font-semibold text-base" style={{ color: locked ? "#A0A0A0" : "#2D2D2D" }}>
                    {item.name}
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: "#6B6B6B" }} numberOfLines={selected ? undefined : 2}>
                    {item.description}
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: selected ? Colors.primary : "#A0A0A0" }}>
                    {previewLabel}
                  </Text>
                </View>
              </View>

              {selected && !locked && selectedEx && (
                <View className="px-4 pb-4 border-t border-primary/20 pt-3">
                  <ExerciseStepper
                    label="Sets"
                    value={selectedEx.sets}
                    min={1}
                    max={10}
                    onChange={(v) => updateExerciseValues(item.id, { sets: v })}
                  />
                  {selectedEx.hold_seconds !== null ? (
                    <ExerciseStepper
                      label="Hold"
                      value={selectedEx.hold_seconds}
                      min={5}
                      max={120}
                      step={5}
                      unit="s"
                      onChange={(v) => updateExerciseValues(item.id, { hold_seconds: v })}
                    />
                  ) : (
                    <ExerciseStepper
                      label="Reps"
                      value={selectedEx.reps}
                      min={1}
                      max={50}
                      onChange={(v) => updateExerciseValues(item.id, { reps: v })}
                    />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        renderSectionFooter={({ section }) => {
          if (section.locked && section.data.length === 0) {
            return (
              <View className="mb-4 px-2 py-3 rounded-2xl bg-surface border border-border border-dashed items-center">
                <Text className="text-sm" style={{ color: "#A0A0A0" }}>
                  Exercises for this phase are coming soon
                </Text>
              </View>
            );
          }
          return null;
        }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-base text-center" style={{ color: "#6B6B6B" }}>
              No exercises found. Check your connection and try again.
            </Text>
          </View>
        }
      />

      <View className="absolute bottom-0 left-0 right-0 bg-background px-6 pb-8 pt-4 border-t border-border">
        <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center" onPress={handleNext}>
          <Text className="text-white font-bold text-lg">
            Next → ({data.selectedExercises.length} selected)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
