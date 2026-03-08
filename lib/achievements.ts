import { supabase } from "./supabase";
import type { Content } from "./types";

interface UserState {
  userId: string;
  daysSinceSurgery: number;
  streak: number;
  totalExercisesCompleted: number;
  dailyComplete: boolean;
  isFirstExercise: boolean;
  isFirstRestDay: boolean;
  isFirstMeasurement: boolean;
  latestFlexion: number | null;
  latestExtension: number | null;
  hasQuadActivation: boolean;
}

export async function checkAchievements(state: UserState): Promise<Content[]> {
  const { data: allAchievements } = await supabase
    .from("content")
    .select("*")
    .eq("type", "achievement");
  if (!allAchievements) return [];

  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("content_id")
    .eq("user_id", state.userId);
  const unlockedIds = new Set((unlocked || []).map((u) => u.content_id));

  const newlyUnlocked: Content[] = [];

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue;

    const trigger = achievement.trigger_condition as Record<string, any> | null;
    if (!trigger) continue;

    let matched = false;
    switch (trigger.type) {
      case "first_exercise_completed":
        matched = state.isFirstExercise;
        break;
      case "daily_complete":
        matched = state.dailyComplete;
        break;
      case "day_reached":
        matched = state.daysSinceSurgery >= trigger.value;
        break;
      case "streak_reached":
        matched = state.streak >= trigger.value;
        break;
      case "first_rest_day":
        matched = state.isFirstRestDay;
        break;
      case "first_measurement":
        matched = state.isFirstMeasurement;
        break;
      case "flexion_above":
        matched = (state.latestFlexion ?? 0) > trigger.value;
        break;
      case "extension_at":
        matched = state.latestExtension !== null && state.latestExtension <= trigger.value;
        break;
      case "first_quad_activation":
        matched = state.hasQuadActivation;
        break;
    }

    if (matched) {
      await supabase
        .from("user_achievements")
        .insert({ user_id: state.userId, content_id: achievement.id });
      newlyUnlocked.push(achievement as Content);
    }
  }

  return newlyUnlocked;
}

export async function getStreak(userId: string): Promise<number> {
  const { data: logs } = await supabase
    .from("daily_logs")
    .select("date, is_rest_day")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(60);

  if (!logs || logs.length === 0) return 0;

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  let checkDate = today;

  for (const log of logs) {
    if (log.date === checkDate) {
      streak++;
      const prev = new Date(checkDate);
      prev.setDate(prev.getDate() - 1);
      checkDate = prev.toISOString().split("T")[0];
    } else if (log.date < checkDate) {
      break;
    }
  }

  return streak;
}
