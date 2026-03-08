import { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { Colors } from "../constants/colors";
import type { Exercise } from "../lib/types";

export default function ExercisePicker() {
  const router = useRouter();
  const { session } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userExerciseIds, setUserExerciseIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase
        .from("exercises")
        .select("*")
        .eq("status", "approved")
        .order("sort_order"),
      supabase
        .from("user_exercises")
        .select("exercise_id")
        .eq("user_id", session.user.id),
    ]).then(([{ data: exercises }, { data: userExercises }]) => {
      setExercises((exercises as Exercise[]) || []);
      setUserExerciseIds(new Set((userExercises || []).map((ue) => ue.exercise_id)));
    });
  }, [session]);

  const filtered = exercises.filter(
    (e) =>
      !userExerciseIds.has(e.id) &&
      e.name.toLowerCase().includes(search.toLowerCase())
  );

  async function addToMyPlan(exercise: Exercise) {
    if (!session) return;
    setAdding(exercise.id);

    const { data: existing } = await supabase
      .from("user_exercises")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("exercise_id", exercise.id)
      .single();

    if (existing) {
      Alert.alert("Already added", "This exercise is already in your plan.");
      setAdding(null);
      return;
    }

    await supabase.from("user_exercises").insert({
      user_id: session.user.id,
      exercise_id: exercise.id,
      sets: exercise.default_sets,
      reps: exercise.default_reps,
      hold_seconds: exercise.default_hold_seconds,
      is_active: true,
      sort_order: 99,
    });

    Alert.alert("Added!", `${exercise.name} added to your plan.`, [
      { text: "OK", onPress: () => router.back() },
    ]);
    setAdding(null);
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-14 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text className="text-xl font-bold" style={{ color: Colors.text }}>Add Exercise</Text>
      </View>

      <TextInput
        className="mx-4 bg-surface border border-border rounded-2xl px-4 py-3 text-base mb-3"
        placeholder="Search exercises..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="mx-4 mb-2 bg-surface rounded-2xl px-4 py-3 border border-border"
            onPress={() => addToMyPlan(item)}
            disabled={adding === item.id}
          >
            <Text className="text-base font-semibold" style={{ color: Colors.text }}>{item.name}</Text>
            <Text className="text-sm mt-1" style={{ color: "#6B6B6B" }} numberOfLines={2}>
              {item.description}
            </Text>
            <Text className="text-xs mt-1" style={{ color: "#A0A0A0" }}>
              {item.default_sets}×{item.default_hold_seconds ? `${item.default_hold_seconds}s hold` : `${item.default_reps} reps`} · {item.category}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center mt-10">
            <Text style={{ color: "#A0A0A0" }}>No exercises found</Text>
          </View>
        }
      />
    </View>
  );
}
