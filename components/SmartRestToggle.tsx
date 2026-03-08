import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

interface Props {
  isRestDay: boolean;
  onToggle: () => void;
}

export function SmartRestToggle({ isRestDay, onToggle }: Props) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center mx-4 mb-4 py-3 rounded-2xl border ${
        isRestDay ? "bg-rest border-rest" : "bg-surface border-border"
      }`}
      onPress={onToggle}
      activeOpacity={0.75}
    >
      <Ionicons
        name={isRestDay ? "bed" : "bed-outline"}
        size={20}
        color={isRestDay ? "#FFFFFF" : Colors.rest}
      />
      <Text className={`ml-2 font-bold ${isRestDay ? "text-white" : ""}`}
        style={!isRestDay ? { color: Colors.rest } : undefined}>
        {isRestDay ? "Rest Day Logged" : "Log Rest Day"}
      </Text>
    </TouchableOpacity>
  );
}
