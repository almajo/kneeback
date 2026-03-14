import { useState, useEffect } from "react";
import { View, Text, TextInput, SectionList, TouchableOpacity, ActivityIndicator, Modal, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { ExerciseStepper } from "../components/ExerciseStepper";
import { Colors } from "../constants/colors";
import { usePhaseGate } from "../lib/hooks/use-phase-gate";
import { GATE_DEFINITIONS, PHASES_ORDERED, PHASE_COLORS } from "../lib/phase-gates";
import type { Exercise, ExercisePhase, UserExercise, GateDefinition } from "../lib/types";

const PHASES: { key: ExercisePhase; label: string; weekRange: string; unlockDay: number }[] = [
  { key: "prehab",                 label: "Prehabilitation",           weekRange: "Pre-Surgery",  unlockDay: -Infinity },
  { key: "acute",                  label: "Immediate Post-Op",         weekRange: "Weeks 0–2",    unlockDay: 0  },
  { key: "early_active",           label: "Early Rehabilitation",      weekRange: "Weeks 2–6",    unlockDay: 14 },
  { key: "strengthening",          label: "Progressive Strengthening", weekRange: "Weeks 6–12",   unlockDay: 42 },
  { key: "advanced_strengthening", label: "Advanced Strengthening",    weekRange: "Months 3–6",   unlockDay: 84 },
  { key: "return_to_sport",        label: "Return to Sport",           weekRange: "Months 6–9+",  unlockDay: 168 },
];

export default function ExercisePicker() {
  const router = useRouter();
  const { session } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userExercisesMap, setUserExercisesMap] = useState<Map<string, UserExercise>>(new Map());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [daysSinceSurgery, setDaysSinceSurgery] = useState(0);
  const [surgeryStatus, setSurgeryStatus] = useState<"no_date" | "pre_surgery" | "post_surgery">("no_date");
  const [loading, setLoading] = useState(true);
  const [gateWarning, setGateWarning] = useState<{ exercise: Exercise; gate: GateDefinition } | null>(null);

  const { gateProgress, confirmedCriteria, toggleCriterion } = usePhaseGate(daysSinceSurgery, surgeryStatus, null);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase.from("exercises").select("*").eq("status", "approved").order("sort_order"),
      supabase.from("user_exercises").select("*, exercise:exercises(*)").eq("user_id", session.user.id),
      supabase.from("profiles").select("surgery_date").eq("id", session.user.id).single(),
    ]).then(([{ data: exs }, { data: ues }, { data: profile }]) => {
      setExercises((exs as Exercise[]) || []);

      const map = new Map<string, UserExercise>();
      for (const ue of (ues as UserExercise[]) || []) {
        map.set(ue.exercise_id, ue);
      }
      setUserExercisesMap(map);

      if (profile?.surgery_date) {
        const surgery = new Date(profile.surgery_date);
        const today = new Date();
        const diff = Math.floor((today.getTime() - surgery.getTime()) / 86400000);
        if (diff >= 0) {
          setDaysSinceSurgery(diff);
          setSurgeryStatus("post_surgery");
        } else {
          setSurgeryStatus("pre_surgery");
        }
      }

      setLoading(false);
    });
  }, [session]);

  function getCurrentPhaseKey(): ExercisePhase {
    if (surgeryStatus === "pre_surgery" || surgeryStatus === "no_date") return "prehab";
    const reversed = PHASES_ORDERED.slice().reverse();
    const match = reversed.find((p) => daysSinceSurgery >= (p.unlockDay === -Infinity ? -Infinity : p.unlockDay));
    return match?.key ?? "prehab";
  }

  function getRequiredGate(exercise: Exercise): GateDefinition | null {
    const phaseIndex = PHASES_ORDERED.findIndex((p) => p.key === exercise.phase);
    const currentPhaseKey = getCurrentPhaseKey();
    const currentPhaseIndex = PHASES_ORDERED.findIndex((p) => p.key === currentPhaseKey);

    if (phaseIndex <= currentPhaseIndex) return null;

    for (let i = currentPhaseIndex; i < phaseIndex; i++) {
      const fromPhase = PHASES_ORDERED[i].key;
      const matchingGate = GATE_DEFINITIONS.find(
        (g) => g.fromPhase === fromPhase && !g.researchGap && !g.informationalOnly
      );
      if (matchingGate) {
        const gp = gateProgress.find((p) => p.gate.gateKey === matchingGate.gateKey);
        if (gp && !gp.allMet) return matchingGate as GateDefinition;
      }
    }

    return null;
  }

  async function performToggle(exercise: Exercise) {
    if (!session) return;
    const exerciseId = exercise.id;
    setSaving((prev) => new Set(prev).add(exerciseId));

    const existing = userExercisesMap.get(exerciseId);

    if (existing && existing.is_active) {
      await supabase.from("user_exercises").update({ is_active: false }).eq("id", existing.id);
      setUserExercisesMap((prev) => {
        const next = new Map(prev);
        next.set(exerciseId, { ...existing, is_active: false });
        return next;
      });
    } else if (existing && !existing.is_active) {
      await supabase.from("user_exercises").update({ is_active: true }).eq("id", existing.id);
      setUserExercisesMap((prev) => {
        const next = new Map(prev);
        next.set(exerciseId, { ...existing, is_active: true });
        return next;
      });
    } else {
      const { data: inserted } = await supabase
        .from("user_exercises")
        .insert({
          user_id: session.user.id,
          exercise_id: exerciseId,
          sets: exercise.default_sets,
          reps: exercise.default_reps,
          hold_seconds: exercise.default_hold_seconds,
          is_active: true,
          sort_order: 99,
        })
        .select("*, exercise:exercises(*)")
        .single();

      if (inserted) {
        setUserExercisesMap((prev) => {
          const next = new Map(prev);
          next.set(exerciseId, inserted as UserExercise);
          return next;
        });
      }
    }

    setSaving((prev) => {
      const next = new Set(prev);
      next.delete(exerciseId);
      return next;
    });
  }

  async function onToggle(exercise: Exercise) {
    const existing = userExercisesMap.get(exercise.id);
    const isCurrentlyActive = existing?.is_active ?? false;

    // Only show gate warning when ACTIVATING an exercise (not deactivating)
    if (!isCurrentlyActive) {
      const requiredGate = getRequiredGate(exercise);
      if (requiredGate) {
        setGateWarning({ exercise, gate: requiredGate });
        return;
      }
    }

    await performToggle(exercise);
  }

  async function onStepperChange(exerciseId: string, field: "sets" | "reps" | "hold_seconds", value: number) {
    const existing = userExercisesMap.get(exerciseId);
    if (!existing) return;

    setUserExercisesMap((prev) => {
      const next = new Map(prev);
      next.set(exerciseId, { ...existing, [field]: value });
      return next;
    });

    await supabase.from("user_exercises").update({ [field]: value }).eq("id", existing.id);
  }

  const searchLower = search.toLowerCase();
  const filteredExercises = search
    ? exercises.filter((e) => e.name.toLowerCase().includes(searchLower))
    : exercises;

  const exercisesByPhase: Record<string, Exercise[]> = {};
  for (const ex of filteredExercises) {
    if (!exercisesByPhase[ex.phase]) exercisesByPhase[ex.phase] = [];
    exercisesByPhase[ex.phase].push(ex);
  }

  const sections = PHASES.map((phase) => {
    const locked =
      phase.key === "prehab"
        ? surgeryStatus === "post_surgery"
        : phase.unlockDay === -Infinity
        ? false
        : daysSinceSurgery < phase.unlockDay;

    return {
      phase,
      data: exercisesByPhase[phase.key] || [],
      locked,
    };
  }).filter((s) => s.data.length > 0);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const warningGateProgress = gateWarning
    ? gateProgress.find((p) => p.gate.gateKey === gateWarning.gate.gateKey)
    : null;

  const unmetCriteria = warningGateProgress
    ? warningGateProgress.criteriaStatus
        .filter((cs) => !cs.met)
        .slice(0, 3)
    : [];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-14 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold" style={{ color: Colors.text }}>Edit Exercises</Text>
      </View>

      <TextInput
        className="mx-4 bg-surface border border-border rounded-2xl px-4 py-3 text-base mb-3"
        placeholder="Search exercises..."
        value={search}
        onChangeText={setSearch}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        renderSectionHeader={({ section }) => {
          const { phase, locked } = section;
          const showUnlockBadge = phase.unlockDay !== -Infinity && locked;
          return (
            <View className="flex-row items-center justify-between py-3 mt-2">
              <View>
                <Text className="font-bold text-base" style={{ color: locked ? "#A0A0A0" : "#2D2D2D" }}>
                  {phase.label}
                </Text>
                <Text className="text-xs" style={{ color: "#A0A0A0" }}>{phase.weekRange}</Text>
              </View>
              {showUnlockBadge && (
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
          const ue = userExercisesMap.get(item.id);
          const isActive = ue?.is_active ?? false;
          const isSaving = saving.has(item.id);

          const sets = ue?.sets ?? item.default_sets;
          const reps = ue?.reps ?? item.default_reps;
          const holdSeconds = ue?.hold_seconds ?? item.default_hold_seconds;

          const previewLabel = `${sets} sets × ${holdSeconds ? `${holdSeconds}s hold` : `${reps} reps`}`;

          return (
            <TouchableOpacity
              className={`mb-3 rounded-2xl border ${
                locked
                  ? "bg-surface border-border opacity-40"
                  : isActive
                  ? "bg-primary/10 border-primary"
                  : "bg-surface border-border"
              }`}
              onPress={() => !locked && !isSaving && onToggle(item)}
              disabled={locked || isSaving}
              activeOpacity={0.8}
            >
              <View className="flex-row items-start p-4">
                {isSaving ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors.primary}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                ) : (
                  <Ionicons
                    name={isActive && !locked ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={isActive && !locked ? Colors.primary : Colors.textMuted}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                )}
                <View className="flex-1">
                  <Text className="font-semibold text-base" style={{ color: locked ? "#A0A0A0" : "#2D2D2D" }}>
                    {item.name}
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: "#6B6B6B" }} numberOfLines={isActive ? undefined : 2}>
                    {item.description}
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: isActive ? Colors.primary : "#A0A0A0" }}>
                    {previewLabel}
                  </Text>
                </View>
              </View>

              {isActive && !locked && (
                <View className="px-4 pb-4 border-t border-primary/20 pt-3">
                  <ExerciseStepper
                    label="Sets"
                    value={sets}
                    min={1}
                    max={10}
                    onChange={(v) => onStepperChange(item.id, "sets", v)}
                  />
                  {holdSeconds !== null ? (
                    <ExerciseStepper
                      label="Hold"
                      value={holdSeconds}
                      min={0}
                      max={120}
                      variableStep
                      unit="s"
                      onChange={(v) => onStepperChange(item.id, "hold_seconds", v)}
                    />
                  ) : (
                    <ExerciseStepper
                      label="Reps"
                      value={reps}
                      min={1}
                      max={50}
                      onChange={(v) => onStepperChange(item.id, "reps", v)}
                    />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="items-center mt-10">
            <Text style={{ color: "#A0A0A0" }}>No exercises found</Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent
        visible={gateWarning !== null}
        onRequestClose={() => setGateWarning(null)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <SafeAreaView style={{ backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <View style={{ padding: 24 }}>
              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="warning-outline" size={22} color={Colors.warning} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.text }}>
                  Research Advisory
                </Text>
              </View>

              {/* Warning message */}
              <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 }}>
                {gateWarning?.gate.warningMessage}
              </Text>

              {/* Unmet criteria */}
              {unmetCriteria.length > 0 && (
                <View style={{ backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>
                    Criteria not yet confirmed:
                  </Text>
                  {unmetCriteria.map((cs) => (
                    <View key={cs.criterion.key} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6 }}>
                      <Ionicons name="close-circle-outline" size={16} color={Colors.error} style={{ marginRight: 6, marginTop: 1 }} />
                      <Text style={{ fontSize: 13, color: Colors.textSecondary, flex: 1 }}>
                        {cs.criterion.plainLabel}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Source citation */}
              {gateWarning?.gate.source && (
                <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 20, fontStyle: "italic" }}>
                  Source: {gateWarning.gate.source}
                </Text>
              )}

              {/* Buttons */}
              <TouchableOpacity
                style={{
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  backgroundColor: Colors.primary,
                  marginBottom: 10,
                }}
                onPress={() => setGateWarning(null)}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Not yet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderWidth: 1.5,
                  borderColor: Colors.border,
                  backgroundColor: Colors.surface,
                  marginBottom: 4,
                }}
                onPress={async () => {
                  const pending = gateWarning?.exercise;
                  setGateWarning(null);
                  if (pending) {
                    await performToggle(pending);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: Colors.textSecondary, fontWeight: "600", fontSize: 15 }}>
                  I understand, add anyway
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
