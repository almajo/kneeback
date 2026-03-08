import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useToday } from "../../lib/hooks/use-today";
import { useAuth } from "../../lib/auth-context";
import { DayHeader } from "../../components/DayHeader";
import { DailyMessage } from "../../components/DailyMessage";
import { SmartRestToggle } from "../../components/SmartRestToggle";
import { ExerciseCard } from "../../components/ExerciseCard";
import { AchievementPopup } from "../../components/AchievementPopup";
import { supabase } from "../../lib/supabase";
import { checkAchievements, getStreak } from "../../lib/achievements";
import { Colors } from "../../constants/colors";
import { useMilestones } from "../../lib/hooks/use-milestones";
import type { Content } from "../../lib/types";

export default function TodayScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const {
    loading,
    daysSinceSurgery,
    weekNumber,
    userExercises,
    dailyLog,
    exerciseLogs: initialExerciseLogs,
    dailyMessage,
    refetch,
    updateUserExercise,
  } = useToday();
  const [exerciseLogs, setExerciseLogs] = useState<typeof initialExerciseLogs>([]);
  const [pendingAchievement, setPendingAchievement] = useState<Content | null>(null);
  const { todayMilestones, refetch: refetchMilestones } = useMilestones();

  useEffect(() => {
    setExerciseLogs(initialExerciseLogs);
  }, [initialExerciseLogs]);

  useFocusEffect(useCallback(() => {
    refetchMilestones();
  }, [refetchMilestones]));

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const isRestDay = dailyLog?.is_rest_day ?? false;
  const userId = session?.user.id;

  async function runAchievementCheck(overrides?: Partial<{ isFirstExercise: boolean; isFirstRestDay: boolean; completed: boolean }>) {
    if (!userId) return;
    const [streak, { data: allLogs }, { data: romRows }] = await Promise.all([
      getStreak(userId),
      supabase.from("exercise_logs").select("id, completed").eq("daily_log_id", dailyLog?.id ?? ""),
      supabase.from("rom_measurements").select("flexion_degrees, extension_degrees, quad_activation").eq("user_id", userId).order("date", { ascending: false }).limit(1),
    ]);
    const logs = allLogs ?? [];
    const completedNow = logs.filter((l) => l.completed).length;
    const totalNow = userExercises.length;
    const rom = romRows?.[0];
    const newAchievements = await checkAchievements({
      userId,
      daysSinceSurgery,
      streak,
      totalExercisesCompleted: completedNow,
      dailyComplete: overrides?.completed ?? (completedNow === totalNow && totalNow > 0),
      isFirstExercise: overrides?.isFirstExercise ?? false,
      isFirstRestDay: overrides?.isFirstRestDay ?? false,
      isFirstMeasurement: false,
      latestFlexion: rom?.flexion_degrees ?? null,
      latestExtension: rom?.extension_degrees ?? null,
      hasQuadActivation: rom?.quad_activation ?? false,
    });
    if (newAchievements.length > 0) {
      setPendingAchievement(newAchievements[0]);
    }
  }

  async function toggleRestDay() {
    if (!dailyLog) return;
    const newIsRest = !isRestDay;
    await supabase
      .from("daily_logs")
      .update({ is_rest_day: newIsRest })
      .eq("id", dailyLog.id);
    await refetch();
    if (newIsRest) {
      const { data: prevRestDays } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("user_id", userId!)
        .eq("is_rest_day", true);
      await runAchievementCheck({ isFirstRestDay: (prevRestDays?.length ?? 0) <= 1 });
    }
  }

  async function updateExerciseLog(userExerciseId: string, updates: Record<string, any>) {
    if (!dailyLog) return;
    const existing = exerciseLogs.find((l) => l.user_exercise_id === userExerciseId);
    const isFirstEver = exerciseLogs.every((l) => !l.completed) && updates.completed === true;

    // Optimistically update local state
    if (existing) {
      setExerciseLogs((prev) =>
        prev.map((l) => (l.id === existing.id ? { ...l, ...updates } : l))
      );
    } else {
      const newLog = {
        id: `temp-${userExerciseId}`,
        daily_log_id: dailyLog.id,
        user_exercise_id: userExerciseId,
        completed: false,
        actual_sets: 0,
        actual_reps: 0,
        ...updates,
      };
      setExerciseLogs((prev) => [...prev, newLog]);
    }

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
    if (updates.completed === true) {
      await refetch();
      await runAchievementCheck({ isFirstExercise: isFirstEver });
    }
  }

  const completedCount = exerciseLogs.filter((l) => l.completed).length;
  const totalCount = userExercises.length;

  return (
    <>
    <AchievementPopup achievement={pendingAchievement} onDismiss={() => setPendingAchievement(null)} />
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 100 }}>
      <DayHeader day={daysSinceSurgery} week={weekNumber} />
      <DailyMessage message={dailyMessage?.body ?? null} />
      <SmartRestToggle isRestDay={isRestDay} onToggle={toggleRestDay} />

      {todayMilestones.length > 0 && (
        <View className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: Colors.primary, shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 }}>
          {/* Decorative top strip */}
          <View style={{ backgroundColor: Colors.primaryDark, paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="trophy" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 }}>TODAY&apos;S THE DAY</Text>
          </View>
          {/* Main content */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>
            {todayMilestones.map((m, i) => (
              <View key={m.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: i > 0 ? 12 : 0 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Text style={{ fontSize: 18 }}>{m.category === "win" ? "⭐" : "🏆"}</Text>
                </View>
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700", lineHeight: 22 }}>{m.title}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 }}>
                    {m.category === "win" ? "You did it — log it and own it." : "A big moment in your recovery."}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

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
                onExerciseUpdate={updateUserExercise}
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
    </>
  );
}
