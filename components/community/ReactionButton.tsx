import { useRef } from "react";
import { Animated, TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

interface Props {
  count: number;
  active: boolean;
  onPress: () => void;
}

export function ReactionButton({ count, active, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <Ionicons
          name={active ? "heart" : "heart-outline"}
          size={18}
          color={active ? Colors.primary : Colors.textMuted}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: active ? Colors.primary : Colors.textMuted,
          }}
        >
          {count}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
