import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useToday } from "../../lib/hooks/use-today";
import { DayHeader } from "../../components/DayHeader";
import { DailyMessage } from "../../components/DailyMessage";
import { SmartRestToggle } from "../../components/SmartRestToggle";
import { ExerciseCard } from "../../components/ExerciseCard";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";

export default function TodayScreen() {
  const router = useRouter();
  const {
    loading,
    daysSinceSurgery,
    weekNumber,
    userExercises,
    dailyLog,
    exerciseLogs,
    dailyMessage,
    refetch,
  } = useToday();

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const isRestDay = dailyLog?.is_rest_day ?? false;

  async function toggleRestDay() {
    if (!dailyLog) return;
    await supabase
      .from("daily_logs")
      .update({ is_rest_day: !isRestDay })
      .eq("id", dailyLog.id);
    refetch();
  }

  async function updateExerciseLog(userExerciseId: string, updates: Record<string, any>) {
    if (!dailyLog) return;
    const existing = exerciseLogs.find((l) => l.user_exercise_id === userExerciseId);
    if (existing) {
      await supabase.from("exercise_logs").update(updates).eq("id", existing.id);
    } else {
      await supabase.from("exercise_logs").insert({
        daily_log_id: dailyLog.id,
        user_exercise_id: userExerciseId,
        completed: false,
        actual_sets: 0,
        actual_reps: 0,
        ...updates,
      });
    }
    refetch();
  }

  const completedCount = exerciseLogs.filter((l) => l.completed).length;
  const totalCount = userExercises.length;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 100 }}>
      <DayHeader day={daysSinceSurgery} week={weekNumber} />
      <DailyMessage message={dailyMessage?.body ?? null} />
      <SmartRestToggle isRestDay={isRestDay} onToggle={toggleRestDay} />

      {isRestDay ? (
        <View className="mx-4 rounded-2xl p-6 items-center" style={{ backgroundColor: "#7E57C220" }}>
          <Text className="text-lg font-bold mb-2" style={{ color: Colors.rest }}>Rest Day</Text>
          <Text className="text-base text-center" style={{ color: "#6B6B6B" }}>
            The couch is officially your medical duty station. Good job listening to your knee.
          </Text>
        </View>
      ) : (
        <>
          {totalCount > 0 && (
            <View className="mx-4 mb-3 flex-row items-center">
              <Text className="text-sm font-semibold" style={{ color: "#6B6B6B" }}>
                {completedCount}/{totalCount} complete
              </Text>
              {completedCount === totalCount && totalCount > 0 && (
                <Text className="ml-2 text-sm font-bold" style={{ color: Colors.success }}>
                  🎉 All done!
                </Text>
              )}
            </View>
          )}

          {userExercises.length === 0 ? (
            <View className="mx-4 bg-surface border border-border rounded-2xl p-6 items-center">
              <Text className="text-base text-center" style={{ color: "#6B6B6B" }}>
                No exercises yet. Add your first one below.
              </Text>
            </View>
          ) : (
            userExercises.map((ue) => (
              <ExerciseCard
                key={ue.id}
                userExercise={ue}
                log={exerciseLogs.find((l) => l.user_exercise_id === ue.id) ?? null}
                onUpdate={(updates) => updateExerciseLog(ue.id, updates)}
                disabled={isRestDay}
              />
            ))
          )}

          <TouchableOpacity
            className="mx-4 mt-2 py-3 rounded-2xl border border-dashed border-primary items-center flex-row justify-center"
            onPress={() => router.push("/exercise-picker")}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
            <Text className="ml-2 text-primary font-bold">Add Exercise</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
