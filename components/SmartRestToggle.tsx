import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

type DayMode = "normal" | "rest" | "pt";

interface Props {
  dayMode: DayMode;
  onModeChange: (mode: DayMode) => void;
}

export function DayModeToggle({ dayMode, onModeChange }: Props) {
  const isRest = dayMode === "rest";
  const isPt = dayMode === "pt";

  function handleRestPress() {
    onModeChange(isRest ? "normal" : "rest");
  }

  function handlePtPress() {
    onModeChange(isPt ? "normal" : "pt");
  }

  return (
    <View className="flex-row mx-4 mb-4 gap-3">
      <TouchableOpacity
        className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${
          isRest ? "border-rest" : "bg-surface border-border"
        }`}
        style={isRest ? { backgroundColor: Colors.rest } : undefined}
        onPress={handleRestPress}
        activeOpacity={0.75}
      >
        <Ionicons
          name={isRest ? "bed" : "bed-outline"}
          size={20}
          color={isRest ? "#FFFFFF" : Colors.rest}
        />
        <Text
          className="ml-2 font-bold"
          style={{ color: isRest ? "#FFFFFF" : Colors.rest }}
        >
          {isRest ? "Rest Logged" : "Log Rest Day"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${
          isPt ? "border-secondary" : "bg-surface border-border"
        }`}
        style={isPt ? { backgroundColor: Colors.secondary } : undefined}
        onPress={handlePtPress}
        activeOpacity={0.75}
      >
        <Ionicons
          name={isPt ? "fitness" : "fitness-outline"}
          size={20}
          color={isPt ? "#FFFFFF" : Colors.secondary}
        />
        <Text
          className="ml-2 font-bold"
          style={{ color: isPt ? "#FFFFFF" : Colors.secondary }}
        >
          {isPt ? "PT Logged" : "Physical Therapy"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
