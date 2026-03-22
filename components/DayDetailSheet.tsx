import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { db } from "../lib/db/database-context";
import { Colors } from "../constants/colors";
import type { LocalMilestone } from "../lib/db/repositories/milestone-repo";
import type { LocalRomMeasurement } from "../lib/db/repositories/rom-repo";

type DayStatus = "complete" | "rest" | "partial" | "missed" | "future";

interface ExerciseItem {
  name: string;
  completed: boolean;
}

interface Props {
  date: string | null;
  status: DayStatus | null;
  milestones: LocalMilestone[];
  romMeasurement: LocalRomMeasurement | null;
  onClose: () => void;
  onDeleteMilestone: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: DayStatus): string {
  const labels: Record<DayStatus, string> = {
    complete: "Complete",
    rest: "Rest Day",
    partial: "Partial",
    missed: "Missed",
    future: "Upcoming",
  };
  return labels[status];
}

function statusColors(status: DayStatus): { bg: string; text: string } {
  switch (status) {
    case "complete":
      return { bg: Colors.success + "22", text: Colors.success };
    case "rest":
      return { bg: Colors.rest + "22", text: Colors.rest };
    case "partial":
      return { bg: Colors.warning + "22", text: Colors.warning };
    case "missed":
      return { bg: "#E5E5E5", text: "#9B9B9B" };
    case "future":
      return { bg: Colors.borderLight, text: Colors.textMuted };
  }
}

function Divider() {
  return <View style={styles.divider} />;
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export function DayDetailSheet({
  date,
  status,
  milestones,
  romMeasurement,
  onClose,
  onDeleteMilestone,
}: Props) {
  const sqliteDb = db.$client;
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [hasLog, setHasLog] = useState(false);
  const [isRestDay, setIsRestDay] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;

    let cancelled = false;

    function fetchExercises() {
      if (!date) return;
      setLoading(true);
      setExercises([]);
      setHasLog(false);
      setIsRestDay(false);

      try {
        const log = sqliteDb.getFirstSync<{ id: string; is_rest_day: number }>(
          "SELECT id, is_rest_day FROM daily_logs WHERE date = ?",
          [date]
        );

        if (cancelled) return;

        if (!log) {
          setHasLog(false);
          setLoading(false);
          return;
        }

        setHasLog(true);
        setIsRestDay(log.is_rest_day === 1);

        if (log.is_rest_day !== 1) {
          const exerciseLogs = sqliteDb.getAllSync<{
            completed: number;
            exercise_name: string;
          }>(
            `SELECT el.completed,
                    e.name AS exercise_name
             FROM exercise_logs el
             JOIN user_exercises ue ON el.user_exercise_id = ue.id
             JOIN exercises e ON ue.exercise_id = e.id
             WHERE el.daily_log_id = ?`,
            [log.id]
          );

          if (cancelled) return;

          const items: ExerciseItem[] = exerciseLogs.map((el) => ({
            name: el.exercise_name ?? "Unknown Exercise",
            completed: el.completed === 1,
          }));
          setExercises(items);
        }
      } catch {
        // silently handle fetch errors — UI shows "No workout logged"
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchExercises();
    return () => {
      cancelled = true;
    };
  }, [date]);

  function confirmDeleteMilestone(id: string, title: string) {
    Alert.alert(
      "Delete Entry",
      `Remove "${title}" from your timeline?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteMilestone(id),
        },
      ]
    );
  }

  const completedCount = exercises.filter((e) => e.completed).length;
  const badge = status ? statusColors(status) : null;

  return (
    <Modal
      visible={date !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.dateText}>{date ? formatDate(date) : ""}</Text>
          {status && badge && (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {statusLabel(status)}
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Divider />

          {/* Milestones & Wins */}
          <SectionHeader title="MILESTONES & WINS" />
          {milestones.length === 0 ? (
            <Text style={styles.mutedText}>No milestones or wins</Text>
          ) : (
            milestones.map((m) => (
              <Pressable
                key={m.id}
                onLongPress={() => confirmDeleteMilestone(m.id, m.title)}
                style={styles.milestoneRow}
              >
                <Text style={styles.milestoneIcon}>
                  {m.category === "milestone" ? "◆" : "★"}
                </Text>
                <View style={styles.milestoneContent}>
                  <Text style={styles.milestoneTitle}>{m.title}</Text>
                  {m.notes ? (
                    <Text style={styles.milestoneNotes}>{m.notes}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}

          <Divider />

          {/* Range of Motion */}
          <SectionHeader title="RANGE OF MOTION" />
          {!romMeasurement ? (
            <Text style={styles.mutedText}>No measurement recorded</Text>
          ) : (
            <View style={styles.romRow}>
              {romMeasurement.flexion_degrees !== null && (
                <Text style={styles.romValue}>
                  Flex:{" "}
                  <Text style={styles.romNumber}>
                    {romMeasurement.flexion_degrees}°
                  </Text>
                </Text>
              )}
              {romMeasurement.extension_degrees !== null && (
                <Text style={[styles.romValue, { marginLeft: 16 }]}>
                  Ext:{" "}
                  <Text style={styles.romNumber}>
                    {romMeasurement.extension_degrees}°
                  </Text>
                </Text>
              )}
              {romMeasurement.quad_activation && (
                <Text style={[styles.romValue, { marginLeft: 16 }]}>
                  ⚡ Quad
                </Text>
              )}
            </View>
          )}

          <Divider />

          {/* Exercises */}
          <SectionHeader title="EXERCISES" />
          {loading ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={styles.loader}
            />
          ) : !hasLog || isRestDay ? (
            <Text style={styles.mutedText}>
              {isRestDay ? "Rest day — no workout" : "No workout logged"}
            </Text>
          ) : exercises.length === 0 ? (
            <Text style={styles.mutedText}>No exercises recorded</Text>
          ) : (
            <>
              <Text style={styles.exerciseSummary}>
                {completedCount} / {exercises.length} done
              </Text>
              {exercises.map((ex, idx) => (
                <View key={idx} style={styles.exerciseRow}>
                  <Text
                    style={[
                      styles.exerciseCheck,
                      {
                        color: ex.completed
                          ? Colors.success
                          : Colors.disabled,
                      },
                    ]}
                  >
                    {ex.completed ? "✓" : "○"}
                  </Text>
                  <Text
                    style={[
                      styles.exerciseName,
                      {
                        color: ex.completed
                          ? Colors.text
                          : Colors.textSecondary,
                      },
                    ]}
                  >
                    {ex.name}
                  </Text>
                </View>
              ))}
            </>
          )}

          <Divider />

          {/* Mood — coming soon */}
          <View style={styles.comingSoonSection}>
            <SectionHeader title="😊 MOOD" />
            <Text style={styles.mutedText}>Coming soon</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  mutedText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  milestoneIcon: {
    fontSize: 14,
    color: Colors.primary,
    marginRight: 8,
    marginTop: 1,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  milestoneNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  romRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  romValue: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  romNumber: {
    fontWeight: "700",
    color: Colors.text,
  },
  loader: {
    marginVertical: 8,
    alignSelf: "flex-start",
  },
  exerciseSummary: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  exerciseCheck: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 8,
    width: 16,
    textAlign: "center",
  },
  exerciseName: {
    fontSize: 14,
    flex: 1,
  },
  comingSoonSection: {
    opacity: 0.4,
  },
});
