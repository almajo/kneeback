import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/colors";
import type { LocalMilestone } from "../lib/db/repositories/milestone-repo";
import type { LocalRomMeasurement } from "../lib/db/repositories/rom-repo";
import type { DataStore } from "../lib/data/data-store.types";
import { AddMilestoneSheet } from "./AddMilestoneSheet";
import { DayDetailSheet } from "./DayDetailSheet";

type DayStatus = "complete" | "rest" | "partial" | "missed" | "future";

interface HeatmapDay {
  date: string;
  status: DayStatus;
}

interface Props {
  store: DataStore;
  milestones: LocalMilestone[];
  measurements: LocalRomMeasurement[];
  onSaveMilestone: (payload: {
    title: string;
    category: "milestone" | "win";
    date: string;
    notes?: string;
    template_key?: string;
  }) => Promise<void>;
  onDeleteMilestone: (id: string) => void;
  surgeryDate: string | null;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const SCREEN_WIDTH = Dimensions.get("window").width;
// mx-4 (16 each side) + px-4 (16 each side inside card) = 64 total horizontal padding
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 64) / 7);

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function getMonthStartOffset(month: string): number {
  const [year, m] = month.split("-").map(Number);
  const jsDay = new Date(year, m - 1, 1).getDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun
}

function statusColor(status: DayStatus): string {
  switch (status) {
    case "complete": return Colors.success;
    case "rest":     return Colors.rest;
    case "partial":  return Colors.warning;
    case "missed":   return "#E5E5E5";
    case "future":   return Colors.borderLight;
  }
}

function statusTextColor(status: DayStatus): string {
  switch (status) {
    case "complete":
    case "rest":
      return "#FFFFFF";
    case "partial":
      return Colors.text;
    case "missed":
    case "future":
      return Colors.textMuted;
  }
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function currentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toMonthString(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function twoYearsAgoMonth(): string {
  const now = new Date();
  const y = now.getFullYear() - 2;
  return `${y}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ProgressCalendar({
  store,
  milestones,
  measurements,
  onSaveMilestone,
  onDeleteMilestone,
  surgeryDate,
}: Props) {
  const maxMonth = currentMonthString();
  const minMonth = surgeryDate ? toMonthString(surgeryDate) : twoYearsAgoMonth();

  const [currentMonth, setCurrentMonth] = useState<string>(() => maxMonth);
  const [heatmapDays, setHeatmapDays] = useState<HeatmapDay[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const [milestoneSheetOpen, setMilestoneSheetOpen] = useState(false);

  // Keep ref in sync for PanResponder closure
  const currentMonthRef = useRef(currentMonth);
  useEffect(() => {
    currentMonthRef.current = currentMonth;
  }, [currentMonth]);

  function prevMonth() {
    setCurrentMonth((m) => {
      if (m <= minMonth) return m;
      const [y, mo] = m.split("-").map(Number);
      const d = new Date(y, mo - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }

  function nextMonth() {
    setCurrentMonth((m) => {
      if (m >= maxMonth) return m;
      const [y, mo] = m.split("-").map(Number);
      const d = new Date(y, mo, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 15 && Math.abs(gs.dy) < 40,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) {
          setCurrentMonth((m) => {
            if (m <= minMonth) return m;
            const [y, mo] = m.split("-").map(Number);
            const d = new Date(y, mo - 2, 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          });
        } else if (gs.dx < -60) {
          setCurrentMonth((m) => {
            if (m >= maxMonth) return m;
            const [y, mo] = m.split("-").map(Number);
            const d = new Date(y, mo, 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          });
        }
      },
    })
  ).current;

  useEffect(() => {
    async function fetchMonthData() {
      setLoadingDays(true);
      const [year, month] = currentMonth.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const today = todayString();
      const startDate = `${currentMonth}-01`;
      const endDate = `${currentMonth}-${String(daysInMonth).padStart(2, "0")}`;

      const monthDates = Array.from({ length: daysInMonth }, (_, i) =>
        `${currentMonth}-${String(i + 1).padStart(2, "0")}`
      );

      const logs = await store.getDailyLogsByDateRange(startDate, endDate);
      const logIds = logs.map((l) => l.id);
      const exLogs = await store.getExerciseLogsByDailyLogIds(logIds);

      const logMap = new Map<string, { isRest: boolean; logId: string }>();
      logs.forEach((l) => logMap.set(l.date, { isRest: l.is_rest_day, logId: l.id }));

      const completionMap = new Map<string, { total: number; done: number }>();
      exLogs.forEach((el) => {
        const entry = completionMap.get(el.daily_log_id) ?? { total: 0, done: 0 };
        completionMap.set(el.daily_log_id, {
          total: entry.total + 1,
          done: entry.done + (el.completed ? 1 : 0),
        });
      });

      const days: HeatmapDay[] = monthDates.map((date) => {
        if (date > today) return { date, status: "future" };
        const log = logMap.get(date);
        if (!log) return { date, status: "missed" };
        if (log.isRest) return { date, status: "rest" };
        const comp = completionMap.get(log.logId);
        if (!comp || comp.total === 0) return { date, status: "missed" };
        if (comp.done === comp.total) return { date, status: "complete" };
        return { date, status: "partial" };
      });

      setHeatmapDays(days);
      setLoadingDays(false);
    }
    fetchMonthData();
  }, [currentMonth, store]);

  const offset = getMonthStartOffset(currentMonth);

  const selectedMilestones = selectedDay
    ? milestones.filter((m) => m.date === selectedDay.date)
    : [];
  const selectedRom = selectedDay
    ? (measurements.find((m) => m.date === selectedDay.date) ?? null)
    : null;

  const milestoneDates = new Set(
    milestones.filter((m) => m.category === "milestone").map((m) => m.date)
  );
  const winDates = new Set(
    milestones.filter((m) => m.category === "win").map((m) => m.date)
  );

  const prevDisabled = currentMonth <= minMonth;
  const nextDisabled = currentMonth >= maxMonth;

  const legendItems: { color: string; label: string }[] = [
    { color: Colors.success, label: "Complete" },
    { color: Colors.warning, label: "Partial" },
    { color: Colors.rest,    label: "Rest" },
    { color: "#E5E5E5",      label: "Missed" },
    { color: Colors.primary, label: "Milestone" },
    { color: Colors.success, label: "Win" },
  ];

  return (
    <>
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Month navigation header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <TouchableOpacity onPress={prevMonth} disabled={prevDisabled} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text
              style={{
                fontSize: 22,
                color: prevDisabled ? Colors.disabled : Colors.text,
                fontWeight: "400",
              }}
            >
              ‹
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text }}>
            {formatMonthLabel(currentMonth)}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={nextMonth} disabled={nextDisabled} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text
                style={{
                  fontSize: 22,
                  color: nextDisabled ? Colors.disabled : Colors.text,
                  fontWeight: "400",
                }}
              >
                ›
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMilestoneSheetOpen(true)}
              style={{
                backgroundColor: Colors.primary + "15",
                borderWidth: 1,
                borderColor: Colors.primary,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.primary }}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day-of-week labels */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            marginTop: 10,
            marginBottom: 4,
          }}
        >
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={{ width: CELL_SIZE, alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "600", color: Colors.textMuted }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View
          {...panResponder.panHandlers}
          style={{ paddingHorizontal: 16, paddingBottom: 16 }}
        >
          {loadingDays ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={{ marginVertical: 32, alignSelf: "center" }}
            />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {/* Offset blank cells */}
              {Array.from({ length: offset }).map((_, i) => (
                <View key={`pad-${i}`} style={{ width: CELL_SIZE, height: CELL_SIZE + 6 }} />
              ))}

              {/* Day cells */}
              {heatmapDays.map((day) => {
                const dayNum = parseInt(day.date.slice(8), 10);
                const hasMilestone = milestoneDates.has(day.date);
                const hasWin = winDates.has(day.date);
                const isSelected = selectedDay?.date === day.date;

                return (
                  <TouchableOpacity
                    key={day.date}
                    onPress={() => setSelectedDay(day)}
                    activeOpacity={0.7}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE + 6,
                      padding: 2,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: statusColor(day.status),
                        borderRadius: 6,
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: 3,
                        paddingBottom: 3,
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: isSelected ? Colors.text : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "500",
                          color: statusTextColor(day.status),
                          lineHeight: 12,
                        }}
                      >
                        {dayNum}
                      </Text>

                      {/* Milestone / win dots */}
                      <View style={{ flexDirection: "row", gap: 2, minHeight: 6 }}>
                        {hasMilestone && (
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: Colors.primary,
                            }}
                          />
                        )}
                        {hasWin && (
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: Colors.success,
                            }}
                          />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Legend */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 16,
            paddingBottom: 14,
            gap: 10,
          }}
        >
          {legendItems.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: item.color,
                  borderWidth: item.color === "#E5E5E5" ? 1 : 0,
                  borderColor: Colors.border,
                }}
              />
              <Text style={{ fontSize: 11, color: Colors.textMuted }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <AddMilestoneSheet
        visible={milestoneSheetOpen}
        onClose={() => setMilestoneSheetOpen(false)}
        onSave={async (payload) => {
          await onSaveMilestone(payload);
          setMilestoneSheetOpen(false);
        }}
      />

      <DayDetailSheet
        date={selectedDay?.date ?? null}
        status={selectedDay?.status ?? null}
        milestones={selectedMilestones}
        romMeasurement={selectedRom}
        onClose={() => setSelectedDay(null)}
        onDeleteMilestone={onDeleteMilestone}
      />
    </>
  );
}
