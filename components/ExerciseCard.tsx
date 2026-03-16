import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, LayoutAnimation } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { RestTimer } from "./RestTimer";
import { SetTracker } from "./SetTracker";
import type { UserExercise, ExerciseLog } from "../lib/types";

interface Props {
  userExercise: UserExercise;
  log: ExerciseLog | null;
  onUpdate: (log: Partial<ExerciseLog>) => void;
  onExerciseUpdate?: (updated: UserExercise) => void;
  disabled: boolean;
  onDrag?: () => void;
}

export function ExerciseCard({ userExercise, log, onUpdate, disabled, onDrag }: Props) {
  const [expanded, setExpanded] = useState(false);

  const exercise = userExercise.exercise!;
  const isCompleted = log?.completed ?? false;
  const currentSet = log?.actual_sets ?? 0;

  // Track current set count in a ref to break circular dependency in timer callback.
  // The ref allows us to read the latest set count without including it in the dependency array.
  const currentSetRef = useRef(currentSet);

  // Keep the ref in sync with currentSet whenever it changes
  useEffect(() => {
    currentSetRef.current = currentSet;
  }, [currentSet]);

  // Auto-collapse when exercise is marked complete
  useEffect(() => {
    if (isCompleted && expanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(false);
    }
  }, [isCompleted]);

  // Memoize callback to prevent RestTimer from unnecessarily restarting its interval.
  // Uses ref to access current set count, avoiding dependency on log?.actual_sets
  // which changes on every set increment.
  const handleTimerComplete = useCallback(() => {
    const nextSet = currentSetRef.current + 1;
    const isLastSet = nextSet === userExercise.sets;
    onUpdate({ actual_sets: nextSet, ...(isLastSet ? { completed: true } : {}) });
  }, [userExercise.sets, onUpdate]);

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
        onPress={() => {
          if (disabled) return;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpanded(!expanded);
        }}
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
        {onDrag && !disabled && (
          <TouchableOpacity
            onLongPress={onDrag}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="ml-2"
          >
            <Ionicons name="reorder-three" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {expanded && !disabled && (
        <View className="px-4 pb-4 border-t border-border pt-3">
          <SetTracker
            current={currentSet}
            total={userExercise.sets}
            onSetComplete={(sets) => {
              const isLastSet = sets === userExercise.sets;
              onUpdate({ actual_sets: sets, ...(isLastSet ? { completed: true } : {}) });
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
    </View>
  );
}
