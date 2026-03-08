import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { RepCounter } from "./RepCounter";
import { RestTimer } from "./RestTimer";
import { SetTracker } from "./SetTracker";
import type { UserExercise, ExerciseLog } from "../lib/types";

interface Props {
  userExercise: UserExercise;
  log: ExerciseLog | null;
  onUpdate: (log: Partial<ExerciseLog>) => void;
  disabled: boolean;
}

export function ExerciseCard({ userExercise, log, onUpdate, disabled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const exercise = userExercise.exercise!;
  const isCompleted = log?.completed ?? false;
  const currentSet = log?.actual_sets ?? 0;
  const currentReps = log?.actual_reps ?? 0;

  const targetLabel = userExercise.hold_seconds
    ? `${userExercise.sets} × ${userExercise.hold_seconds}s hold`
    : `${userExercise.sets} × ${userExercise.reps} reps`;

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
            onSetComplete={(sets) => onUpdate({ actual_sets: sets })}
          />
          {userExercise.hold_seconds ? (
            <RestTimer seconds={userExercise.hold_seconds} />
          ) : (
            <RepCounter
              current={currentReps}
              target={userExercise.reps}
              onChange={(reps) => onUpdate({ actual_reps: reps })}
            />
          )}
        </View>
      )}
    </View>
  );
}
