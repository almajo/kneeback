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

      {isEmpty ? (
        <TouchableOpacity
          onPress={onAdd}
          className="border-2 border-dashed rounded-2xl py-8 items-center"
          style={{ borderColor: Colors.border }}
        >
          <Text className="text-2xl mb-2">🏁</Text>
          <Text className="text-base font-semibold mb-1" style={{ color: Colors.textSecondary }}>
            {milestones.length > 0 ? "No upcoming milestones" : "Add your first milestone"}
          </Text>
          <Text className="text-sm" style={{ color: Colors.textMuted }}>
            {milestones.length > 0 ? "Tap + Add to set your next goal" : "Track upcoming events and personal wins"}
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="bg-surface border border-border rounded-2xl overflow-hidden">
          {/* Upcoming */}
          {visibleUpcoming.length > 0 && visibleUpcoming.map((m, i) => (
            <MilestoneNode
              key={m.id}
              milestone={m}
              isFirst={i === 0}
              isLast={false}
              onLongPress={() => confirmDelete(m)}
            />
          ))}

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

  const nodeColor = isMilestone ? Colors.primary : Colors.success;
  const dimmed = past && !isToday;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View
        className="flex-row px-4 py-3"
        style={{
          opacity: dimmed ? 0.55 : 1,
          backgroundColor: isToday ? nodeColor + "0D" : "transparent",
          borderTopWidth: isFirst ? 0 : 1,
          borderTopColor: Colors.border,
        }}
      >
        {/* Timeline column */}
        <View style={{ width: 28, alignItems: "center", paddingTop: 2 }}>
          {isToday ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <NodeIcon category={milestone.category} color={nodeColor} />
            </Animated.View>
          ) : (
            <NodeIcon category={milestone.category} color={nodeColor} />
          )}
        </View>

        {/* Content */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            className="text-sm font-semibold"
            style={{ color: dimmed ? Colors.textMuted : Colors.text }}
          >
            {milestone.title}
          </Text>
          <View className="flex-row items-center mt-0.5 gap-2">
            <Text className="text-xs" style={{ color: Colors.textMuted }}>
              {formatDate(milestone.date)}
            </Text>
            {daysUntil !== null && daysUntil >= 0 && (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: Colors.primary + "20" }}
              >
                <Text className="text-xs font-semibold" style={{ color: Colors.primary }}>
                  {daysUntil === 0 ? "today!" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}
                </Text>
              </View>
            )}
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

function NodeIcon({ category, color }: { category: "milestone" | "win"; color: string }) {
  return (
    <Text style={{ fontSize: 16, color, lineHeight: 20 }}>
      {category === "milestone" ? "◆" : "★"}
    </Text>
  );
}
