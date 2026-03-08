import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { RestTimer } from "./RestTimer";
import { SetTracker } from "./SetTracker";
import { ExerciseStepper } from "./ExerciseStepper";
import { supabase } from "../lib/supabase";
import type { UserExercise, ExerciseLog } from "../lib/types";

interface Props {
  userExercise: UserExercise;
  log: ExerciseLog | null;
  onUpdate: (log: Partial<ExerciseLog>) => void;
  onExerciseUpdate?: (updated: UserExercise) => void;
  disabled: boolean;
}

export function ExerciseCard({ userExercise, log, onUpdate, onExerciseUpdate, disabled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSets, setEditSets] = useState(userExercise.sets);
  const [editReps, setEditReps] = useState(userExercise.reps);
  const [editHold, setEditHold] = useState(userExercise.hold_seconds);
  const [saving, setSaving] = useState(false);

  const exercise = userExercise.exercise!;
  const isCompleted = log?.completed ?? false;
  const currentSet = log?.actual_sets ?? 0;

  // Memoize callback to prevent RestTimer from unnecessarily restarting its interval.
  // Reads actual_sets directly from log prop to avoid stale closure bugs when user
  // manually advances the set before timer completes.
  const handleTimerComplete = useCallback(() => {
    const nextSet = (log?.actual_sets ?? 0) + 1;
    onUpdate({ actual_sets: nextSet });

    // If this was the final set, mark exercise as completed
    if (nextSet === userExercise.sets) {
      onUpdate({ completed: true });
    }
  }, [log?.actual_sets, userExercise.sets, onUpdate]);

  const targetLabel = userExercise.hold_seconds
    ? `${userExercise.sets} × ${userExercise.hold_seconds}s hold`
    : `${userExercise.sets} × ${userExercise.reps} reps`;

  function openEdit() {
    setEditSets(userExercise.sets);
    setEditReps(userExercise.reps);
    setEditHold(userExercise.hold_seconds);
    setEditOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("user_exercises")
      .update({ sets: editSets, reps: editReps, hold_seconds: editHold })
      .eq("id", userExercise.id);

    if (error) {
      Alert.alert("Error", "Could not save changes. Try again.");
      setSaving(false);
      return;
    }

    onExerciseUpdate?.({ ...userExercise, sets: editSets, reps: editReps, hold_seconds: editHold });
    setSaving(false);
    setEditOpen(false);
  }

  return (
    <View
      className={`mx-4 mb-3 rounded-2xl border ${disabled ? "opacity-40" : ""}`}
      style={{
        backgroundColor: isCompleted ? Colors.success + "15" : "#FFFFFF",
        borderColor: isCompleted ? Colors.success + "60" : "#E8E0D8",
      }}
    >
      <TouchableOpacity
        className="flex-row items-center px-4 py-4"
        onPress={() => !disabled && setExpanded(!expanded)}
        disabled={disabled}
      >
        <TouchableOpacity
          onPress={() => !disabled && onUpdate({ completed: !isCompleted })}
          disabled={disabled}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
            size={28}
            color={isCompleted ? Colors.success : Colors.textMuted}
          />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text
            className={`text-base font-semibold ${isCompleted ? "line-through" : ""}`}
            style={{ color: isCompleted ? Colors.textMuted : Colors.text }}
          >
            {exercise.name}
          </Text>
          <Text className="text-sm" style={{ color: "#6B6B6B" }}>{targetLabel}</Text>
        </View>
        {!disabled && (
          <TouchableOpacity
            onPress={openEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-2"
          >
            <Ionicons name="pencil-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && !disabled && (
        <View className="px-4 pb-4 border-t border-border pt-3">
          <SetTracker
            current={currentSet}
            total={userExercise.sets}
            onSetComplete={(sets) => {
              onUpdate({ actual_sets: sets });
              if (sets === userExercise.sets) {
                onUpdate({ completed: true });
              }
            }}
          />
          {userExercise.hold_seconds && (
            <RestTimer
              seconds={userExercise.hold_seconds}
              onTimerComplete={handleTimerComplete}
            />
          )}
        </View>
      )}

      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setEditOpen(false)}
        />
        <View
          className="bg-background rounded-t-3xl px-6 pt-6 pb-10"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        >
          <View className="w-10 h-1 rounded-full bg-border self-center mb-6" />
          <Text className="text-xl font-bold mb-1" style={{ color: "#2D2D2D" }}>
            {exercise.name}
          </Text>
          <Text className="text-sm mb-6" style={{ color: "#6B6B6B" }}>Adjust your targets</Text>

          <ExerciseStepper
            label="Sets"
            value={editSets}
            min={1}
            max={10}
            onChange={setEditSets}
          />
          {editHold !== null ? (
            <ExerciseStepper
              label="Hold"
              value={editHold}
              min={5}
              max={120}
              step={5}
              unit="s"
              onChange={setEditHold}
            />
          ) : (
            <ExerciseStepper
              label="Reps"
              value={editReps}
              min={1}
              max={50}
              onChange={setEditReps}
            />
          )}

          <View className="flex-row gap-3 mt-6">
            <TouchableOpacity
              className="flex-1 border border-border rounded-2xl py-3 items-center"
              onPress={() => setEditOpen(false)}
            >
              <Text className="font-semibold" style={{ color: "#6B6B6B" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary rounded-2xl py-3 items-center"
              onPress={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.5 : 1 }}
            >
              <Text className="text-white font-semibold">{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
