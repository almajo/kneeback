import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, Alert } from "react-native";
import { Colors } from "../constants/colors";
import type { Milestone } from "../lib/types";

const TODAY = new Date().toISOString().split("T")[0];
const DEFAULT_VISIBLE = 3;

interface Props {
  milestones: Milestone[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}

function getDaysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - new Date(TODAY).getTime();
  return Math.ceil(ms / 86400000);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MilestoneTimeline({ milestones, onAdd, onDelete }: Props) {
  const [showAll, setShowAll] = useState(false);

  const upcoming = milestones.filter((m) => m.date > TODAY).slice().reverse(); // nearest first
  const past = milestones.filter((m) => m.date <= TODAY).slice().reverse(); // most recent first

  const visibleUpcoming = showAll ? upcoming : upcoming.slice(0, DEFAULT_VISIBLE);
  const totalHidden = upcoming.length - visibleUpcoming.length;
  const isEmpty = upcoming.length === 0;

  function confirmDelete(m: Milestone) {
    Alert.alert(
      "Remove entry?",
      `"${m.title}" will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onDelete(m.id) },
      ]
    );
  }

  return (
    <View className="mx-4 mb-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-bold" style={{ color: Colors.text }}>
          Milestones & Wins
        </Text>
        <TouchableOpacity
          onPress={onAdd}
          className="flex-row items-center rounded-full px-3 py-1.5"
          style={{ backgroundColor: Colors.primary + "15" }}
        >
          <Text className="text-base font-bold mr-1" style={{ color: Colors.primary }}>+</Text>
          <Text className="text-sm font-semibold" style={{ color: Colors.primary }}>Add</Text>
        </TouchableOpacity>
      </View>

      {milestones.length === 0 ? (
        <TouchableOpacity
          onPress={onAdd}
          className="border-2 border-dashed rounded-2xl py-8 items-center"
          style={{ borderColor: Colors.border }}
        >
          <Text className="text-2xl mb-2">🏁</Text>
          <Text className="text-base font-semibold mb-1" style={{ color: Colors.textSecondary }}>
            Add your first milestone
          </Text>
          <Text className="text-sm" style={{ color: Colors.textMuted }}>
            Track upcoming events and personal wins
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="bg-surface border border-border rounded-2xl overflow-hidden">
          {/* Upcoming section */}
          {visibleUpcoming.length > 0 && (
            <>
              <View className="px-4 py-2 border-b border-border" style={{ backgroundColor: Colors.background }}>
                <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: Colors.textMuted }}>
                  Upcoming
                </Text>
              </View>
              {visibleUpcoming.map((m, i) => (
                <MilestoneNode
                  key={m.id}
                  milestone={m}
                  isFirst={i === 0}
                  isLast={false}
                  onLongPress={() => confirmDelete(m)}
                />
              ))}
            </>
          )}

          {/* Show all toggle */}
          {totalHidden > 0 && (
            <TouchableOpacity
              className="py-3 items-center border-t border-border"
              onPress={() => setShowAll(true)}
            >
              <Text className="text-sm font-semibold" style={{ color: Colors.primary }}>
                Show {totalHidden} more →
              </Text>
            </TouchableOpacity>
          )}
          {showAll && upcoming.length > DEFAULT_VISIBLE && (
            <TouchableOpacity
              className="py-3 items-center border-t border-border"
              onPress={() => setShowAll(false)}
            >
              <Text className="text-sm font-semibold" style={{ color: Colors.textMuted }}>
                Show less
              </Text>
            </TouchableOpacity>
          )}

          {/* Achieved section */}
          {past.length > 0 && (
            <>
              <View className="px-4 py-2 border-t border-border" style={{ backgroundColor: Colors.background }}>
                <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: Colors.textMuted }}>
                  Achieved
                </Text>
              </View>
              {past.slice(0, 3).map((m, i) => (
                <MilestoneNode
                  key={m.id}
                  milestone={m}
                  isFirst={i === 0}
                  isLast={i === Math.min(past.length, 3) - 1}
                  past
                  onLongPress={() => confirmDelete(m)}
                />
              ))}
              {past.length > 3 && (
                <View className="py-2 items-center border-t border-border">
                  <Text className="text-xs" style={{ color: Colors.textMuted }}>
                    + {past.length - 3} more achieved
                  </Text>
                </View>
              )}
            </>
          )}

          {isEmpty && (
            <TouchableOpacity
              onPress={onAdd}
              className="py-8 items-center border-t border-border"
            >
              <Text className="text-sm" style={{ color: Colors.textMuted }}>
                No upcoming milestones — Tap + Add to set your next goal
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

interface NodeProps {
  milestone: Milestone;
  isFirst: boolean;
  isLast: boolean;
  past?: boolean;
  onLongPress: () => void;
}

function MilestoneNode({ milestone, isFirst, isLast, past = false, onLongPress }: NodeProps) {
  const isMilestone = milestone.category === "milestone";
  const isToday = milestone.date === TODAY;
  const daysUntil = isMilestone && !past ? getDaysUntil(milestone.date) : null;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isToday && !past) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isToday, past]);

  const nodeColor = past ? Colors.success : (isMilestone ? Colors.primary : Colors.success);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View
        className="flex-row px-4 py-3"
        style={{
          backgroundColor: isToday ? nodeColor + "0D" : past ? Colors.success + "08" : "transparent",
          borderTopWidth: isFirst ? 0 : 1,
          borderTopColor: Colors.border,
        }}
      >
        {/* Timeline column */}
        <View style={{ width: 28, alignItems: "center", paddingTop: 2 }}>
          {isToday ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <NodeIcon category={milestone.category} color={nodeColor} past={past} />
            </Animated.View>
          ) : (
            <NodeIcon category={milestone.category} color={nodeColor} past={past} />
          )}
        </View>

        {/* Content */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            className="text-sm font-semibold"
            style={{ color: past ? Colors.textMuted : Colors.text }}
          >
            {milestone.title}
          </Text>
          <View className="flex-row items-center mt-0.5 gap-2">
            <Text className="text-xs" style={{ color: Colors.textMuted }}>
              {formatDate(milestone.date)}
            </Text>
            {past ? (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: Colors.success + "20" }}
              >
                <Text className="text-xs font-semibold" style={{ color: Colors.success }}>
                  ✓ achieved
                </Text>
              </View>
            ) : daysUntil !== null && daysUntil >= 0 ? (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: Colors.primary + "20" }}
              >
                <Text className="text-xs font-semibold" style={{ color: Colors.primary }}>
                  {daysUntil === 0 ? "today!" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}
                </Text>
              </View>
            ) : null}
          </View>
          {milestone.notes && (
            <Text className="text-xs mt-1" style={{ color: Colors.textMuted }}>
              {milestone.notes}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function NodeIcon({ category, color, past }: { category: "milestone" | "win"; color: string; past?: boolean }) {
  if (past) {
    return (
      <Text style={{ fontSize: 16, color, lineHeight: 20 }}>✓</Text>
    );
  }
  return (
    <Text style={{ fontSize: 16, color, lineHeight: 20 }}>
      {category === "milestone" ? "◆" : "★"}
    </Text>
  );
}
