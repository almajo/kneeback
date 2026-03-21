import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import { ExerciseStepper } from "../components/ExerciseStepper";
import { MuscleTag } from "../components/MuscleTag";
import { Colors } from "../constants/colors";
import { usePhaseGate } from "../lib/hooks/use-phase-gate";
import {
  GATE_DEFINITIONS,
  PHASES_ORDERED,
  PHASE_COLORS,
  PHASE_DISPLAY_NAMES,
  getPhaseFromDays,
} from "../lib/phase-gates";
import {
  filterExercisesBySurgeryStatus,
  groupExercisesByDisplayPhase,
  getPrimaryExercises,
  getAlternatives,
  getOptionalExercises,
  displayPhaseFor,
} from "../lib/exercise-utils";
import { getAllExercises } from "../lib/db/repositories/exercise-repo";
import {
  getAllUserExercises,
  createUserExercise,
  updateUserExercise,
  type LocalUserExercise,
} from "../lib/db/repositories/user-exercise-repo";
import { getProfile } from "../lib/db/repositories/profile-repo";
import type { Exercise, ExercisePhase, GateDefinition } from "../lib/types";
import type { SurgeryStatus } from "../lib/hooks/use-today";

export default function ExercisePicker() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userExercisesMap, setUserExercisesMap] = useState<
    Map<string, LocalUserExercise>
  >(new Map());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [daysSinceSurgery, setDaysSinceSurgery] = useState(0);
  const [surgeryStatus, setSurgeryStatus] = useState<SurgeryStatus>("no_date");
  const [loading, setLoading] = useState(true);
  const [gateWarning, setGateWarning] = useState<{
    exercise: Exercise;
    gate: GateDefinition;
  } | null>(null);
  const [expandedAlternatives, setExpandedAlternatives] = useState<
    Set<string>
  >(new Set());
  const [expandedOptionals, setExpandedOptionals] = useState<Set<string>>(
    new Set()
  );

  const { gateProgress } = usePhaseGate(daysSinceSurgery, surgeryStatus, null);

  useEffect(() => {
    getAllExercises(db).then((exs) => {
      setExercises(exs);

      const ues = getAllUserExercises(db);
      const map = new Map<string, LocalUserExercise>();
      for (const ue of ues) map.set(ue.exercise_id, ue);
      setUserExercisesMap(map);

      const profile = getProfile(db);
      if (profile?.surgery_date) {
        const diff = Math.floor(
          (Date.now() - new Date(profile.surgery_date).getTime()) / 86400000
        );
        if (diff >= 0) {
          setDaysSinceSurgery(diff);
          setSurgeryStatus("post_surgery");
        } else {
          setSurgeryStatus("pre_surgery");
        }
      }

      setLoading(false);
    });
  }, [db]);

  const currentPhase = getPhaseFromDays(daysSinceSurgery, surgeryStatus);

  function getRequiredGate(exercise: Exercise): GateDefinition | null {
    const displayPhase = displayPhaseFor(exercise, surgeryStatus);
    const displayIdx = PHASES_ORDERED.findIndex((p) => p.key === displayPhase);
    const currentIdx = PHASES_ORDERED.findIndex((p) => p.key === currentPhase);
    if (displayIdx <= currentIdx) return null;
    for (let i = currentIdx; i < displayIdx; i++) {
      const fromPhase = PHASES_ORDERED[i].key;
      const gate = GATE_DEFINITIONS.find(
        (g) =>
          g.fromPhase === fromPhase && !g.researchGap && !g.informationalOnly
      );
      if (gate) {
        const gp = gateProgress.find((p) => p.gate.gateKey === gate.gateKey);
        if (gp && !gp.allMet) return gate as GateDefinition;
      }
    }
    return null;
  }

  function performToggle(exercise: Exercise) {
    setSaving((prev) => new Set(prev).add(exercise.id));
    const existing = userExercisesMap.get(exercise.id);

    if (existing?.is_active) {
      const updated = updateUserExercise(db, existing.id, { is_active: false });
      setUserExercisesMap((prev) =>
        new Map(prev).set(exercise.id, updated)
      );
    } else if (existing && !existing.is_active) {
      const updated = updateUserExercise(db, existing.id, { is_active: true });
      setUserExercisesMap((prev) =>
        new Map(prev).set(exercise.id, updated)
      );
    } else {
      const inserted = createUserExercise(db, {
        id: crypto.randomUUID(),
        exercise_id: exercise.id,
        sets: exercise.default_sets,
        reps: exercise.default_reps,
        hold_seconds: exercise.default_hold_seconds,
        is_active: true,
        sort_order: 99,
      });
      setUserExercisesMap((prev) =>
        new Map(prev).set(exercise.id, inserted)
      );
    }

    setSaving((prev) => {
      const n = new Set(prev);
      n.delete(exercise.id);
      return n;
    });
  }

  function onToggle(exercise: Exercise) {
    if (userExercisesMap.get(exercise.id)?.is_active) {
      performToggle(exercise);
      return;
    }
    const gate = getRequiredGate(exercise);
    if (gate) {
      setGateWarning({ exercise, gate });
      return;
    }
    performToggle(exercise);
  }

  function onStepperChange(
    exerciseId: string,
    field: "sets" | "reps" | "hold_seconds",
    value: number
  ) {
    const existing = userExercisesMap.get(exerciseId);
    if (!existing) return;
    const updated = updateUserExercise(db, existing.id, { [field]: value });
    setUserExercisesMap((prev) => new Map(prev).set(exerciseId, updated));
  }

  const searchLower = search.toLowerCase();
  const matchesSearch = (ex: Exercise) =>
    !search || ex.name.toLowerCase().includes(searchLower);
  const visibleExercises = filterExercisesBySurgeryStatus(exercises, surgeryStatus);
  const grouped = groupExercisesByDisplayPhase(visibleExercises, surgeryStatus);
  const postOpPhases: ExercisePhase[] = [
    "acute",
    "early_active",
    "strengthening",
    "advanced_strengthening",
    "return_to_sport",
  ];
  const activePhases: ExercisePhase[] =
    surgeryStatus === "post_surgery" ? postOpPhases : ["prehab"];

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
    ? warningGateProgress.criteriaStatus.filter((cs) => !cs.met).slice(0, 3)
    : [];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-14 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold" style={{ color: Colors.text }}>
          Edit Exercises
        </Text>
      </View>

      <TextInput
        className="mx-4 bg-surface border border-border rounded-2xl px-4 py-3 text-base mb-3"
        placeholder="Search exercises..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor={Colors.textMuted}
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {activePhases.map((phaseKey) => {
          const phaseExercises = grouped.get(phaseKey) ?? [];
          if (phaseExercises.length === 0) return null;
          const phaseEntry = PHASES_ORDERED.find((p) => p.key === phaseKey)!;
          const displayInfo = PHASE_DISPLAY_NAMES[phaseKey];
          const phaseColor = PHASE_COLORS[phaseKey];
          const isLocked =
            phaseKey !== "prehab" && daysSinceSurgery < phaseEntry.unlockDay;
          const isCurrent = phaseKey === currentPhase;
          const unlockWeek = Math.ceil(phaseEntry.unlockDay / 7);
          const strengthening = phaseExercises.filter(
            (e) =>
              e.category === "strengthening" || e.category === "activation"
          );
          const mobility = phaseExercises.filter((e) => e.category === "rom");
          const optionals = getOptionalExercises(phaseExercises);
          const optionalsExpanded = expandedOptionals.has(phaseKey);

          return (
            <View
              key={phaseKey}
              style={{ opacity: isLocked ? 0.5 : 1, marginBottom: 8 }}
            >
              <View className="flex-row items-center justify-between py-3 mt-2">
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="font-bold text-base"
                      style={{
                        color: isLocked ? "#A0A0A0" : phaseColor,
                      }}
                    >
                      {displayInfo.label}
                    </Text>
                    {isCurrent && (
                      <View
                        style={{
                          backgroundColor: phaseColor + "22",
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: phaseColor,
                            fontSize: 10,
                            fontWeight: "600",
                          }}
                        >
                          Current
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs" style={{ color: "#A0A0A0" }}>
                    {displayInfo.weekRange}
                  </Text>
                </View>
                {isLocked && (
                  <View className="bg-surface border border-border rounded-full px-3 py-1">
                    <Text className="text-xs" style={{ color: "#A0A0A0" }}>
                      🔒 Unlocks week {unlockWeek}
                    </Text>
                  </View>
                )}
              </View>

              {strengthening.length > 0 && (
                <ExerciseCategorySection
                  label="Strengthening"
                  exercises={strengthening}
                  locked={isLocked}
                  allPhaseExercises={phaseExercises}
                  userExercisesMap={userExercisesMap}
                  saving={saving}
                  expandedAlternatives={expandedAlternatives}
                  setExpandedAlternatives={setExpandedAlternatives}
                  onToggle={onToggle}
                  onStepperChange={onStepperChange}
                  matchesSearch={matchesSearch}
                />
              )}

              {mobility.length > 0 && (
                <ExerciseCategorySection
                  label="Mobility"
                  exercises={mobility}
                  locked={isLocked}
                  allPhaseExercises={phaseExercises}
                  userExercisesMap={userExercisesMap}
                  saving={saving}
                  expandedAlternatives={expandedAlternatives}
                  setExpandedAlternatives={setExpandedAlternatives}
                  onToggle={onToggle}
                  onStepperChange={onStepperChange}
                  matchesSearch={matchesSearch}
                />
              )}

              {optionals.length > 0 && (
                <View className="mb-2">
                  <TouchableOpacity
                    className="flex-row items-center justify-between px-3 py-2 rounded-xl bg-surface border border-border"
                    onPress={() =>
                      setExpandedOptionals((prev) => {
                        const n = new Set(prev);
                        if (optionalsExpanded) n.delete(phaseKey);
                        else n.add(phaseKey);
                        return n;
                      })
                    }
                    disabled={isLocked}
                  >
                    <Text
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#666" }}
                    >
                      Optional exercises
                    </Text>
                    <Text style={{ color: "#666", fontSize: 11 }}>
                      {optionals.length} exercises{" "}
                      {optionalsExpanded ? "▾" : "▸"}
                    </Text>
                  </TouchableOpacity>
                  {optionalsExpanded &&
                    optionals.filter(matchesSearch).map((ex) => (
                      <ExerciseRow
                        key={ex.id}
                        exercise={ex}
                        locked={isLocked}
                        userExercise={userExercisesMap.get(ex.id)}
                        isSaving={saving.has(ex.id)}
                        onToggle={() => onToggle(ex)}
                        onStepperChange={onStepperChange}
                      />
                    ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={gateWarning !== null}
        onRequestClose={() => setGateWarning(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <SafeAreaView
            style={{
              backgroundColor: Colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <View style={{ padding: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="warning-outline"
                  size={22}
                  color={Colors.warning}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: Colors.text,
                  }}
                >
                  Research Advisory
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.textSecondary,
                  lineHeight: 20,
                  marginBottom: 16,
                }}
              >
                {gateWarning?.gate.warningMessage}
              </Text>
              {unmetCriteria.length > 0 && (
                <View
                  style={{
                    backgroundColor: Colors.surfaceAlt,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: Colors.text,
                      marginBottom: 8,
                    }}
                  >
                    Criteria not yet confirmed:
                  </Text>
                  {unmetCriteria.map((cs) => (
                    <View
                      key={cs.criterion.key}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        marginBottom: 6,
                      }}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={16}
                        color={Colors.error}
                        style={{ marginRight: 6, marginTop: 1 }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          color: Colors.textSecondary,
                          flex: 1,
                        }}
                      >
                        {cs.criterion.plainLabel}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {gateWarning?.gate.source && (
                <Text
                  style={{
                    fontSize: 11,
                    color: Colors.textMuted,
                    marginBottom: 20,
                    fontStyle: "italic",
                  }}
                >
                  Source: {gateWarning.gate.source}
                </Text>
              )}
              <TouchableOpacity
                style={{
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  backgroundColor: Colors.primary,
                  marginBottom: 10,
                }}
                onPress={() => setGateWarning(null)}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  Not yet
                </Text>
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
                onPress={() => {
                  const p = gateWarning?.exercise;
                  setGateWarning(null);
                  if (p) performToggle(p);
                }}
              >
                <Text
                  style={{
                    color: Colors.textSecondary,
                    fontWeight: "600",
                    fontSize: 15,
                  }}
                >
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

interface CategorySectionProps {
  label: string;
  exercises: Exercise[];
  locked: boolean;
  allPhaseExercises: Exercise[];
  userExercisesMap: Map<string, LocalUserExercise>;
  saving: Set<string>;
  expandedAlternatives: Set<string>;
  setExpandedAlternatives: React.Dispatch<React.SetStateAction<Set<string>>>;
  onToggle: (ex: Exercise) => void;
  onStepperChange: (
    id: string,
    field: "sets" | "reps" | "hold_seconds",
    value: number
  ) => void;
  matchesSearch: (ex: Exercise) => boolean;
}

function ExerciseCategorySection({
  label,
  exercises,
  locked,
  allPhaseExercises,
  userExercisesMap,
  saving,
  expandedAlternatives,
  setExpandedAlternatives,
  onToggle,
  onStepperChange,
  matchesSearch,
}: CategorySectionProps) {
  const primaries = getPrimaryExercises(exercises).filter(matchesSearch);
  if (primaries.length === 0) return null;
  return (
    <View className="mb-3">
      <Text
        className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
        style={{ color: "#666" }}
      >
        {label}
      </Text>
      {primaries.map((primary) => {
        const alternatives = getAlternatives(
          allPhaseExercises,
          primary.id
        ).filter(matchesSearch);
        const altExpanded = expandedAlternatives.has(primary.id);
        return (
          <View key={primary.id}>
            <ExerciseRow
              exercise={primary}
              locked={locked}
              userExercise={userExercisesMap.get(primary.id)}
              isSaving={saving.has(primary.id)}
              onToggle={() => onToggle(primary)}
              onStepperChange={onStepperChange}
              alternativesCount={alternatives.length}
              altExpanded={altExpanded}
              onToggleAlternatives={() =>
                setExpandedAlternatives((prev) => {
                  const n = new Set(prev);
                  if (altExpanded) n.delete(primary.id);
                  else n.add(primary.id);
                  return n;
                })
              }
            />
            {altExpanded &&
              alternatives.map((alt) => (
                <View key={alt.id} style={{ marginLeft: 16 }}>
                  <ExerciseRow
                    exercise={alt}
                    locked={locked}
                    userExercise={userExercisesMap.get(alt.id)}
                    isSaving={saving.has(alt.id)}
                    onToggle={() => onToggle(alt)}
                    onStepperChange={onStepperChange}
                  />
                </View>
              ))}
          </View>
        );
      })}
    </View>
  );
}

interface ExerciseRowProps {
  exercise: Exercise;
  locked: boolean;
  userExercise: LocalUserExercise | undefined;
  isSaving: boolean;
  onToggle: () => void;
  onStepperChange: (
    id: string,
    field: "sets" | "reps" | "hold_seconds",
    value: number
  ) => void;
  alternativesCount?: number;
  altExpanded?: boolean;
  onToggleAlternatives?: () => void;
}

function ExerciseRow({
  exercise,
  locked,
  userExercise,
  isSaving,
  onToggle,
  onStepperChange,
  alternativesCount = 0,
  altExpanded = false,
  onToggleAlternatives,
}: ExerciseRowProps) {
  const isActive = userExercise?.is_active ?? false;
  const sets = userExercise?.sets ?? exercise.default_sets;
  const reps = userExercise?.reps ?? exercise.default_reps;
  const holdSeconds = userExercise?.hold_seconds ?? exercise.default_hold_seconds;
  const previewLabel = `${sets} sets × ${holdSeconds ? `${holdSeconds}s hold` : `${reps} reps`}`;

  return (
    <TouchableOpacity
      className={`mb-2 rounded-2xl border ${locked ? "bg-surface border-border opacity-40" : isActive ? "bg-primary/10 border-primary" : "bg-surface border-border"}`}
      onPress={() => !locked && !isSaving && onToggle()}
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
            name={
              isActive && !locked ? "checkmark-circle" : "ellipse-outline"
            }
            size={24}
            color={isActive && !locked ? Colors.primary : Colors.textMuted}
            style={{ marginRight: 12, marginTop: 2 }}
          />
        )}
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-1 mb-1">
            <Text
              className="font-semibold text-base"
              style={{ color: locked ? "#A0A0A0" : Colors.text }}
            >
              {exercise.name}
            </Text>
            {exercise.muscle_groups.map((g) => (
              <MuscleTag key={g} group={g} />
            ))}
          </View>
          <Text
            className="text-sm"
            style={{ color: "#6B6B6B" }}
            numberOfLines={isActive ? undefined : 2}
          >
            {exercise.description}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Text
              className="text-xs"
              style={{ color: isActive ? Colors.primary : "#A0A0A0" }}
            >
              {previewLabel}
            </Text>
            {alternativesCount > 0 && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onToggleAlternatives?.();
                }}
                className="bg-surface border border-border rounded-full px-2 py-0.5"
              >
                <Text className="text-xs" style={{ color: "#888" }}>
                  {alternativesCount} alternative
                  {alternativesCount > 1 ? "s" : ""}{" "}
                  {altExpanded ? "▾" : "▸"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {isActive && !locked && (
        <View className="px-4 pb-4 border-t border-primary/20 pt-3">
          <ExerciseStepper
            label="Sets"
            value={sets}
            min={1}
            max={10}
            onChange={(v) => onStepperChange(exercise.id, "sets", v)}
          />
          {holdSeconds !== null ? (
            <ExerciseStepper
              label="Hold"
              value={holdSeconds}
              min={0}
              max={120}
              variableStep
              unit="s"
              onChange={(v) => onStepperChange(exercise.id, "hold_seconds", v)}
            />
          ) : (
            <ExerciseStepper
              label="Reps"
              value={reps}
              min={1}
              max={50}
              onChange={(v) => onStepperChange(exercise.id, "reps", v)}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
