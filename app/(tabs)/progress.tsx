import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { RomDualChart } from "../../components/RomDualChart";
import { QuadStreak } from "../../components/QuadStreak";
import { CalendarHeatmap } from "../../components/CalendarHeatmap";
import { MilestoneTimeline } from "../../components/MilestoneTimeline";
import { AddMilestoneSheet } from "../../components/AddMilestoneSheet";
import { LogRomSheet } from "../../components/LogRomSheet";
import { useMilestones } from "../../lib/hooks/use-milestones";
import type { RomMeasurement } from "../../lib/types";

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
  const [milestoneSheetOpen, setMilestoneSheetOpen] = useState(false);
  const [romSheetOpen, setRomSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RomMeasurement | null>(null);
  const { milestones, addMilestone, deleteMilestone } = useMilestones();
  const [romData, setRomData] = useState<{ date: string; flexion: number | null; extension: number | null }[]>([]);
  const [measurements, setMeasurements] = useState<RomMeasurement[]>([]);
  const [activationDays, setActivationDays] = useState<Set<string>>(new Set());
  const [heatmapDays, setHeatmapDays] = useState<{ date: string; status: "complete" | "rest" | "partial" | "missed" | "future" }[]>([]);
  const [surgeryDate, setSurgeryDate] = useState<string | null>(null);

  const last30 = getLast30Dates();
  const monthDates = getCurrentMonthDates();
  const now = new Date().toISOString().split("T")[0];
  const currentMonth = now.slice(0, 7);

  const daysSinceSurgery = surgeryDate
    ? Math.floor((Date.now() - new Date(surgeryDate).getTime()) / 86_400_000)
    : 0;

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;

    async function fetchAll() {
      // Profile for surgery date
      const { data: profile } = await supabase
        .from("profiles")
        .select("surgery_date")
        .eq("id", userId)
        .single();
      if (profile?.surgery_date) setSurgeryDate(profile.surgery_date);

      // ROM measurements
      const { data: romRows } = await supabase
        .from("rom_measurements")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (romRows) {
        setMeasurements((romRows as RomMeasurement[]).slice().reverse());
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

  async function fetchMeasurements() {
    if (!session) return;
    const userId = session.user.id;
    const { data: romRows } = await supabase
      .from("rom_measurements")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (romRows) {
      setMeasurements((romRows as RomMeasurement[]).slice().reverse());
      setRomData(romRows.map((r) => ({
        date: r.date,
        flexion: r.flexion_degrees,
        extension: r.extension_degrees,
      })));
      setActivationDays(new Set(
        romRows.filter((r) => r.quad_activation).map((r) => r.date)
      ));
    }
  }

  async function handleSaveRom(payload: {
    date: string;
    flexion_degrees: number | null;
    extension_degrees: number | null;
    quad_activation: boolean;
  }) {
    if (!session) return;
    const userId = session.user.id;

    const record = { user_id: userId, ...payload };

    if (editingEntry) {
      const { error } = await supabase
        .from("rom_measurements")
        .update(record)
        .eq("id", editingEntry.id);
      if (error) Alert.alert("Error", error.message);
    } else {
      const { error } = await supabase.from("rom_measurements").insert(record);
      if (error) Alert.alert("Error", error.message);
    }

    setEditingEntry(null);
    await fetchMeasurements();
  }

  function openEditSheet(m: RomMeasurement) {
    setEditingEntry(m);
    setRomSheetOpen(true);
  }

  function openAddSheet() {
    setEditingEntry(null);
    setRomSheetOpen(true);
  }

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
        visible={milestoneSheetOpen}
        onClose={() => setMilestoneSheetOpen(false)}
        onSave={addMilestone}
      />
      <LogRomSheet
        visible={romSheetOpen}
        onClose={() => { setRomSheetOpen(false); setEditingEntry(null); }}
        onSave={handleSaveRom}
        editingEntry={editingEntry}
      />
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
        <MilestoneTimeline
          milestones={milestones}
          onAdd={() => setMilestoneSheetOpen(true)}
          onDelete={deleteMilestone}
        />
        <View className="mx-4 my-2 border-b border-border" />

        <CalendarHeatmap days={heatmapDays} month={currentMonth} milestones={milestones} />
        <View className="mx-4 my-2 border-b border-border" />

        {/* ROM section */}
        <View className="flex-row items-center justify-between mx-4 mb-3">
          <Text className="text-base font-semibold" style={{ color: Colors.text }}>Log ROM</Text>
          <TouchableOpacity
            onPress={openAddSheet}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-full border border-primary"
            style={{ backgroundColor: Colors.primary + "15" }}
          >
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text className="text-sm font-semibold" style={{ color: Colors.primary }}>Log</Text>
          </TouchableOpacity>
        </View>

        {romData.length === 0 ? (
          <View className="mx-4 bg-surface border border-border rounded-2xl p-6 items-center mb-4">
            <Text className="text-3xl mb-2">📐</Text>
            <Text className="text-base font-semibold mb-1 text-center" style={{ color: Colors.text }}>
              No measurements yet
            </Text>
            <Text className="text-sm text-center" style={{ color: Colors.textSecondary }}>
              Tap + Log to record your first measurement.
            </Text>
          </View>
        ) : (
          <RomDualChart data={romData} daysSinceSurgery={daysSinceSurgery} />
        )}

        {/* Measurement history */}
        {measurements.length > 0 && (
          <View className="mx-4 mb-4">
            {measurements.map((m) => (
              <TouchableOpacity
                key={m.id}
                className="bg-surface border border-border rounded-2xl p-4 mb-2 flex-row items-center"
                onPress={() => openEditSheet(m)}
              >
                <View className="flex-1">
                  <Text className="text-xs font-semibold mb-1" style={{ color: Colors.textMuted }}>{m.date}</Text>
                  <View className="flex-row gap-4">
                    {m.flexion_degrees !== null && (
                      <Text className="text-base font-bold" style={{ color: Colors.primary }}>
                        Flex {m.flexion_degrees}°
                      </Text>
                    )}
                    {m.extension_degrees !== null && (
                      <Text className="text-base font-bold" style={{ color: Colors.secondary }}>
                        Ext {m.extension_degrees}°
                      </Text>
                    )}
                    {m.quad_activation && (
                      <Text className="text-base" style={{ color: Colors.success }}>⚡ Quad</Text>
                    )}
                  </View>
                </View>
                <Ionicons name="pencil-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="mx-4 my-2 border-b border-border" />
        <QuadStreak activationDays={activationDays} last30={last30} />
      </ScrollView>
    </>
  );
}
