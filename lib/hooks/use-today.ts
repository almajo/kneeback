import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../auth-context";
import { getStreak } from "../achievements";
import type { UserExercise, DailyLog, ExerciseLog, Content } from "../types";

export type SurgeryStatus = "no_date" | "pre_surgery" | "post_surgery";

export function useToday() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<{ surgery_date: string | null } | null>(null);
  const [userExercises, setUserExercises] = useState<UserExercise[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [dailyMessage, setDailyMessage] = useState<Content | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const userId = session?.user.id;

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Fetch profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("surgery_date")
      .eq("id", userId)
      .single();
    setProfile(prof);

    // Fetch active user exercises with exercise details
    const { data: exercises } = await supabase
      .from("user_exercises")
      .select("*, exercise:exercises(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("sort_order");
    setUserExercises((exercises as UserExercise[]) || []);

    // Get or create today's daily log
    let { data: log } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (!log) {
      const { data: newLog } = await supabase
        .from("daily_logs")
        .insert({ user_id: userId, date: today, is_rest_day: false })
        .select()
        .single();
      log = newLog;
    }
    setDailyLog(log as DailyLog);

    // Fetch exercise logs for today
    if (log) {
      const { data: logs } = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("daily_log_id", log.id);
      setExerciseLogs((logs as ExerciseLog[]) || []);
    }

    // Pick a deterministic daily message
    const { data: messages } = await supabase
      .from("content")
      .select("*")
      .eq("type", "daily_message");
    if (messages && messages.length > 0) {
      const dayIndex = Math.floor(new Date(today).getTime() / 86400000) % messages.length;
      setDailyMessage(messages[dayIndex] as Content);
    }

    // Fetch streak
    const currentStreak = await getStreak(userId);
    setStreak(currentStreak);

    setLoading(false);
  }, [userId, today]);

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

  function updateUserExercise(updated: UserExercise) {
    setUserExercises((prev) => prev.map((ue) => (ue.id === updated.id ? updated : ue)));
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
