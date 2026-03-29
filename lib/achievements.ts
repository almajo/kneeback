import type { DataStore, CatalogStore } from "./data/data-store.types";
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

export async function checkAchievements(
  state: UserState,
  store: DataStore,
  catalog: CatalogStore
): Promise<Content[]> {
  const allContent = await catalog.getAllContent();
  const allAchievements = allContent.filter((c) => c.type === "achievement");
  if (allAchievements.length === 0) return [];

  const unlocked = await store.getAchievements();
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
      await store.unlockAchievement(achievement.id);
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

export async function getStreak(store: DataStore): Promise<number> {
  const logs = await store.getDailyLogsForStreak();

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
