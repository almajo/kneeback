import { desc } from "drizzle-orm";
import { db } from "./db/database-context";
import { daily_logs } from "./db/schema";
import { getUnlockedAchievements, unlockAchievement } from "./db/repositories/achievement-repo";
import { getAllContent } from "./db/repositories/content-repo";
import type { Content } from "./types";

interface UserState {
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
  const allAchievements = await getAllContent("achievement");
  if (allAchievements.length === 0) return [];

  const unlocked = await getUnlockedAchievements();
  const unlockedIds = new Set(unlocked.map((u) => u.content_id));

  const newlyUnlocked: Content[] = [];

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue;

    const trigger = achievement.trigger_condition as Record<string, unknown> | null;
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
        matched = state.daysSinceSurgery >= (trigger.value as number);
        break;
      case "streak_reached":
        matched = state.streak >= (trigger.value as number);
        break;
      case "first_rest_day":
        matched = state.isFirstRestDay;
        break;
      case "first_measurement":
        matched = state.isFirstMeasurement;
        break;
      case "flexion_above":
        matched = (state.latestFlexion ?? 0) > (trigger.value as number);
        break;
      case "extension_at":
        matched =
          state.latestExtension !== null &&
          state.latestExtension <= (trigger.value as number);
        break;
      case "first_quad_activation":
        matched = state.hasQuadActivation;
        break;
    }

    if (matched) {
      await unlockAchievement(achievement.id);
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

export async function getStreak(): Promise<number> {
  const logs = await db
    .select({ date: daily_logs.date, is_rest_day: daily_logs.is_rest_day })
    .from(daily_logs)
    .orderBy(desc(daily_logs.date))
    .limit(60);

  if (logs.length === 0) return 0;

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
