import { useEffect, useState } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { RomChart } from "../../components/RomChart";
import { QuadStreak } from "../../components/QuadStreak";
import { CalendarHeatmap } from "../../components/CalendarHeatmap";
import { MilestoneTimeline } from "../../components/MilestoneTimeline";
import { AddMilestoneSheet } from "../../components/AddMilestoneSheet";
import { useMilestones } from "../../lib/hooks/use-milestones";

function getLast30Dates(): string[] {
  const dates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getCurrentMonthDates(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return dates;
}

export default function ProgressScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { milestones, addMilestone, deleteMilestone } = useMilestones();
  const [romData, setRomData] = useState<{ date: string; flexion: number | null; extension: number | null }[]>([]);
  const [activationDays, setActivationDays] = useState<Set<string>>(new Set());
  const [heatmapDays, setHeatmapDays] = useState<{ date: string; status: "complete" | "rest" | "partial" | "missed" | "future" }[]>([]);

  const last30 = getLast30Dates();
  const monthDates = getCurrentMonthDates();
  const now = new Date().toISOString().split("T")[0];
  const currentMonth = now.slice(0, 7);

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;

    async function fetchAll() {
      // ROM measurements
      const { data: romRows } = await supabase
        .from("rom_measurements")
        .select("date, flexion_degrees, extension_degrees, quad_activation")
        .eq("user_id", userId)
        .order("date");

      if (romRows) {
        setRomData(romRows.map((r) => ({
          date: r.date,
          flexion: r.flexion_degrees,
          extension: r.extension_degrees,
        })));
        setActivationDays(new Set(
          romRows.filter((r) => r.quad_activation).map((r) => r.date)
        ));
      }

      // Daily logs for heatmap
      const { data: logs } = await supabase
        .from("daily_logs")
        .select("date, is_rest_day, id")
        .eq("user_id", userId)
        .gte("date", `${currentMonth}-01`);

      const logIds = (logs || []).map((l) => l.id);
      const { data: exLogs } = await supabase
        .from("exercise_logs")
        .select("daily_log_id, user_exercise_id, completed")
        .in("daily_log_id", logIds.length > 0 ? logIds : [""]);

      const logMap = new Map<string, { isRest: boolean; logId: string }>();
      (logs || []).forEach((l) => logMap.set(l.date, { isRest: l.is_rest_day, logId: l.id }));

      // Deduplicate by (daily_log_id, user_exercise_id): an exercise is done if ANY row is completed
      const exerciseStatusMap = new Map<string, boolean>();
      (exLogs || []).forEach((el) => {
        const key = `${el.daily_log_id}|${el.user_exercise_id}`;
        exerciseStatusMap.set(key, (exerciseStatusMap.get(key) ?? false) || el.completed);
      });

      const completionMap = new Map<string, { total: number; done: number }>();
      exerciseStatusMap.forEach((isDone, key) => {
        const dailyLogId = key.split("|")[0];
        const entry = completionMap.get(dailyLogId) || { total: 0, done: 0 };
        entry.total++;
        if (isDone) entry.done++;
        completionMap.set(dailyLogId, entry);
      });

      const days = monthDates.map((date) => {
        if (date > now) return { date, status: "future" as const };
        const log = logMap.get(date);
        if (!log) return { date, status: "missed" as const };
        if (log.isRest) return { date, status: "rest" as const };
        const comp = completionMap.get(log.logId);
        if (!comp || comp.total === 0) return { date, status: "missed" as const };
        if (comp.done === comp.total) return { date, status: "complete" as const };
        return { date, status: "partial" as const };
      });
      setHeatmapDays(days);
      setLoading(false);
    }

    fetchAll();
  }, [session]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
    <AddMilestoneSheet
      visible={sheetOpen}
      onClose={() => setSheetOpen(false)}
      onSave={addMilestone}
    />
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
      <MilestoneTimeline
        milestones={milestones}
        onAdd={() => setSheetOpen(true)}
        onDelete={deleteMilestone}
      />
      <View className="mx-4 my-2 border-b border-border" />

      <CalendarHeatmap days={heatmapDays} month={currentMonth} milestones={milestones} />
      <View className="mx-4 my-2 border-b border-border" />
      <RomChart data={romData} />
      <View className="mx-4 my-2 border-b border-border" />
      <QuadStreak activationDays={activationDays} last30={last30} />

      {romData.length === 0 && (
        <View className="mx-4 mt-4 bg-surface border border-border rounded-2xl p-6 items-center">
          <Text className="text-3xl mb-2">📐</Text>
          <Text className="text-base font-semibold mb-1 text-center" style={{ color: "#2D2D2D" }}>
            No measurements yet
          </Text>
          <Text className="text-sm text-center" style={{ color: "#6B6B6B" }}>
            Log your first ROM measurement in the Measure tab to unlock your progress charts.
          </Text>
        </View>
      )}
    </ScrollView>
    </>
  );
}
