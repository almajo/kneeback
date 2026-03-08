import { useEffect, useRef } from "react";
import { View, Text, Modal, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import type { Content } from "../lib/types";

interface Props {
  achievement: Content | null;
  onDismiss: () => void;
}

export function AchievementPopup({ achievement, onDismiss }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (achievement) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
    }
  }, [achievement]);

  return (
    <Modal transparent visible={!!achievement} animationType="none" onRequestClose={onDismiss}>
      <TouchableOpacity
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
          className="bg-surface rounded-3xl mx-8 p-8 items-center"
        >
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: Colors.primary + "20" }}
          >
            <Ionicons name="trophy" size={40} color={Colors.primary} />
          </View>

          <Text className="text-xs font-bold tracking-widest mb-2" style={{ color: Colors.primary }}>
            ACHIEVEMENT UNLOCKED
          </Text>
          <Text className="text-xl font-bold text-center mb-3" style={{ color: "#2D2D2D" }}>
            {achievement?.title}
          </Text>
          <Text className="text-base text-center mb-6" style={{ color: "#6B6B6B" }}>
            {achievement?.body}
          </Text>

          <TouchableOpacity
            className="bg-primary rounded-2xl px-8 py-3"
            onPress={onDismiss}
          >
            <Text className="text-white font-bold text-base">Nice!</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
