import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useOnboarding } from "../../lib/onboarding-context";
import { Colors } from "../../constants/colors";
import type { Exercise } from "../../lib/types";

export default function PickExercises() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("exercises")
      .select("*")
      .eq("phase", "early")
      .eq("status", "approved")
      .order("sort_order")
      .then(({ data }) => {
        const exs = data || [];
        setExercises(exs);
        // Pre-select all early exercises
        setSelected(new Set(exs.map((e) => e.id)));
        setLoading(false);
      });
  }, []);

  function toggleExercise(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleNext() {
    update({ selectedExerciseIds: Array.from(selected) });
    router.push("/(onboarding)/set-reminder");
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-14 pb-4">
        <Text className="text-3xl font-bold text-primary mb-2">Your exercises</Text>
        <Text className="text-base" style={{ color: "#6B6B6B" }}>
          We've selected a standard early-phase plan. Deselect anything your physio hasn't prescribed.
        </Text>
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              className={`mb-3 rounded-2xl border p-4 flex-row items-start ${
                isSelected ? "bg-primary/10 border-primary" : "bg-surface border-border"
              }`}
              onPress={() => toggleExercise(item.id)}
            >
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={isSelected ? Colors.primary : Colors.textMuted}
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text className="font-semibold text-base" style={{ color: "#2D2D2D" }}>{item.name}</Text>
                <Text className="text-sm mt-1" style={{ color: "#6B6B6B" }} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text className="text-xs mt-1" style={{ color: "#A0A0A0" }}>
                  {item.default_sets} sets × {item.default_hold_seconds ? `${item.default_hold_seconds}s hold` : `${item.default_reps} reps`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 bg-background px-6 pb-8 pt-4 border-t border-border">
        <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center" onPress={handleNext}>
          <Text className="text-white font-bold text-lg">Next → ({selected.size} selected)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
