import { useState, useEffect, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { getProfile } from "../db/repositories/profile-repo";
import { getActiveUserExercises } from "../db/repositories/user-exercise-repo";
import { getOrCreateDailyLog } from "../db/repositories/daily-log-repo";
import { getExerciseLogsByDailyLogId } from "../db/repositories/exercise-log-repo";
import { getStreak } from "../achievements";
import { getAllContent } from "../db/repositories/content-repo";
import type { LocalUserExercise } from "../db/repositories/user-exercise-repo";
import type { LocalDailyLog } from "../db/repositories/daily-log-repo";
import type { LocalExerciseLog } from "../db/repositories/exercise-log-repo";
import type { Content } from "../types";

export type SurgeryStatus = "no_date" | "pre_surgery" | "post_surgery";

export function useToday() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<{ surgery_date: string | null } | null>(null);
  const [userExercises, setUserExercises] = useState<LocalUserExercise[]>([]);
  const [dailyLog, setDailyLog] = useState<LocalDailyLog | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<LocalExerciseLog[]>([]);
  const [dailyMessage, setDailyMessage] = useState<Content | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  const fetchAll = useCallback(() => {
    setLoading(true);

    const prof = getProfile(db);
    setProfile(prof ? { surgery_date: prof.surgery_date } : null);

    const exercises = getActiveUserExercises(db);
    setUserExercises(exercises);

    const log = getOrCreateDailyLog(db, today);
    setDailyLog(log);

    const logs = getExerciseLogsByDailyLogId(db, log.id);
    setExerciseLogs(logs);

    const messages = getAllContent(db, "daily_message");
    if (messages.length > 0) {
      const dayIndex =
        Math.floor(new Date(today).getTime() / 86400000) % messages.length;
      setDailyMessage(messages[dayIndex]);
    }

    const currentStreak = getStreak(db);
    setStreak(currentStreak);

    setLoading(false);
  }, [db, today]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const surgeryDate = profile?.surgery_date ?? null;

  let surgeryStatus: SurgeryStatus = "no_date";
  let daysSinceSurgery = 0;
  let daysUntilSurgery: number | null = null;

  if (surgeryDate) {
    const surgeryMs = new Date(surgeryDate).getTime();
    const todayMs = new Date(today).getTime();
    const diffDays = Math.floor((todayMs - surgeryMs) / 86400000);
    if (diffDays >= 0) {
      surgeryStatus = "post_surgery";
      daysSinceSurgery = diffDays;
    } else {
      surgeryStatus = "pre_surgery";
      daysUntilSurgery = Math.abs(diffDays);
    }
  }

  const weekNumber = Math.floor(daysSinceSurgery / 7) + 1;

  function updateUserExercise(updated: LocalUserExercise) {
    setUserExercises((prev) =>
      prev.map((ue) => (ue.id === updated.id ? updated : ue))
    );
  }

  return {
    loading,
    surgeryStatus,
    daysSinceSurgery,
    daysUntilSurgery,
    weekNumber,
    userExercises,
    dailyLog,
    exerciseLogs,
    dailyMessage,
    streak,
    refetch: fetchAll,
    updateUserExercise,
  };
}
