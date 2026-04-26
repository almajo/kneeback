import { useState } from "react";
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
import type { ExercisePhase, ExerciseCategory } from "../lib/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  currentPhase: ExercisePhase;
  onSaved: () => void;
}

const CATEGORIES: { label: string; value: ExerciseCategory }[] = [
  { label: "Strengthening", value: "strengthening" },
  { label: "Mobility", value: "rom" },
  { label: "Activation", value: "activation" },
];

export function AddExerciseSheet({ visible, onClose, currentPhase, onSaved }: Props) {
  const store = useDataStore();
  const { session } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("strengthening");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setCategory("strengthening");
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
      const exerciseId = generateId();
      await store.createExercise({
        id: exerciseId,
        name: name.trim(),
        description: description.trim(),
        phase_start: currentPhase,
        phase_end: null,
        role: "optional",
        muscle_groups: [],
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
            Add Exercise
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
              autoFocus
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
                {saving ? "Adding…" : "Add Exercise"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
