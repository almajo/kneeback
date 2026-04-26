import { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useDataStore } from "../lib/data/data-store-context";
import { useAuth } from "../lib/auth-context";
import { generateId } from "../lib/utils/uuid";
import { ExerciseStepper } from "./ExerciseStepper";
import { Colors } from "../constants/colors";
import type { Exercise, ExercisePhase, ExerciseCategory, ExerciseMuscleGroup } from "../lib/types";

const ALL_MUSCLE_GROUPS: ExerciseMuscleGroup[] = [
  "Quad", "Hamstring", "Hip", "Calf", "Knee ROM", "Core", "Glute",
];

const MUSCLE_TAG_COLORS: Record<ExerciseMuscleGroup, { bg: string; text: string }> = {
  Quad:        { bg: '#3B82F620', text: '#3B82F6' },
  Hamstring:   { bg: '#7C3AED20', text: '#7C3AED' },
  Hip:         { bg: '#F59E0B20', text: '#F59E0B' },
  Calf:        { bg: '#16A34A20', text: '#16A34A' },
  'Knee ROM':  { bg: '#0D948820', text: '#0D9488' },
  Core:        { bg: '#FF6B3520', text: '#FF6B35' },
  Glute:       { bg: '#E11D4820', text: '#E11D48' },
};

interface Props {
  visible: boolean;
  onClose: () => void;
  currentPhase?: ExercisePhase;
  onSaved: () => void;
  editExercise?: Exercise;
}

const CATEGORIES: { label: string; value: ExerciseCategory }[] = [
  { label: "Strengthening", value: "strengthening" },
  { label: "Mobility", value: "rom" },
  { label: "Activation", value: "activation" },
];

export function AddExerciseSheet({ visible, onClose, currentPhase, onSaved, editExercise }: Props) {
  const store = useDataStore();
  const { session } = useAuth();
  const isEditing = !!editExercise;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("strengthening");
  const [muscleGroups, setMuscleGroups] = useState<ExerciseMuscleGroup[]>([]);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && editExercise) {
      setName(editExercise.name);
      setDescription(editExercise.description);
      setCategory(editExercise.category);
      setMuscleGroups(editExercise.muscle_groups);
      setSets(editExercise.default_sets);
      setReps(editExercise.default_reps);
      setError(null);
    }
  }, [visible, editExercise]);

  function toggleMuscleGroup(group: ExerciseMuscleGroup) {
    setMuscleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  }

  function reset() {
    setName("");
    setDescription("");
    setCategory("strengthening");
    setMuscleGroups([]);
    setSets(3);
    setReps(10);
    setSaving(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Exercise name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        await store.updateExercise(editExercise.id, {
          name: name.trim(),
          description: description.trim(),
          category,
          muscle_groups: muscleGroups,
          default_sets: sets,
          default_reps: reps,
        });
      } else {
        const exerciseId = generateId();
        await store.createExercise({
          id: exerciseId,
          name: name.trim(),
          description: description.trim(),
          phase_start: currentPhase!,
          phase_end: null,
          role: "optional",
          muscle_groups: muscleGroups,
          default_sets: sets,
          default_reps: reps,
          default_hold_seconds: null,
          category,
          submitted_by: session?.user.id ?? null,
          sort_order: 999,
        });
        await store.createUserExercise({
          id: generateId(),
          exercise_id: exerciseId,
          sets,
          reps,
          hold_seconds: null,
          sort_order: 99,
        });
      }
      reset();
      onClose();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const canSave = name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={handleClose}
        />
        <View className="bg-background rounded-t-3xl px-6 pt-4 pb-10">
          <View className="w-10 h-1 rounded-full bg-border self-center mb-5" />

          <Text className="text-xl font-bold mb-4" style={{ color: Colors.text }}>
            {isEditing ? "Edit Exercise" : "Add Exercise"}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
              NAME
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-2xl px-4 py-3 text-base mb-4"
              style={{ color: Colors.text }}
              placeholder="e.g. Terminal Knee Extension"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={(t) => { setName(t); setError(null); }}
              autoFocus={!isEditing}
            />

            <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
              CATEGORY
            </Text>
            <View className="flex-row gap-2 mb-4">
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  className="flex-1 rounded-2xl py-2.5 items-center border"
                  style={{
                    backgroundColor: category === c.value ? Colors.primary + "15" : Colors.surface,
                    borderColor: category === c.value ? Colors.primary : Colors.border,
                  }}
                  onPress={() => setCategory(c.value)}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: category === c.value ? Colors.primary : Colors.textSecondary }}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
              MUSCLE GROUPS (OPTIONAL)
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {ALL_MUSCLE_GROUPS.map((group) => {
                const selected = muscleGroups.includes(group);
                const colors = MUSCLE_TAG_COLORS[group];
                return (
                  <TouchableOpacity
                    key={group}
                    onPress={() => toggleMuscleGroup(group)}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      backgroundColor: colors.bg,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.text : "transparent",
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 10, fontWeight: "500" }}>
                      {group}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
              DESCRIPTION (OPTIONAL)
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-2xl px-4 py-3 text-base mb-4"
              style={{ color: Colors.text, minHeight: 72, textAlignVertical: "top" }}
              placeholder="How to perform this exercise…"
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View className="bg-surface border border-border rounded-2xl px-4 py-2 mb-6">
              <ExerciseStepper label="Sets" value={sets} min={1} max={10} onChange={setSets} />
              <View className="h-px" style={{ backgroundColor: Colors.border }} />
              <ExerciseStepper label="Reps" value={reps} min={1} max={50} variableStep onChange={setReps} />
            </View>

            {error && (
              <Text className="text-sm mb-3 text-center" style={{ color: Colors.error }}>
                {error}
              </Text>
            )}

            <TouchableOpacity
              className="rounded-2xl py-4 items-center"
              style={{
                backgroundColor: canSave ? Colors.primary : Colors.border,
                opacity: saving ? 0.6 : 1,
              }}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              <Text className="text-white font-bold text-base">
                {saving ? (isEditing ? "Saving…" : "Adding…") : (isEditing ? "Save Changes" : "Add Exercise")}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
