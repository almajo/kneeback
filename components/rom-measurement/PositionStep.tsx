import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

interface Props {
  onReady: () => void;
}

export function PositionStep({ onReady }: Props) {
  return (
    <View className="flex-1 px-6 pt-10 pb-10 justify-between">
      <View>
        <Text className="text-2xl font-bold mb-2" style={{ color: Colors.text }}>
          Get into position
        </Text>
        <Text className="text-base mb-8" style={{ color: Colors.textSecondary }}>
          Before we measure, set up like this:
        </Text>

        <View className="gap-5">
          {[
            { label: "Lie flat on your back", sub: "On a bed, mat, or firm surface." },
            { label: "Straighten your leg as much as possible", sub: "Rest it flat on the surface." },
            { label: "Start with phone on your thigh", sub: "Screen facing up, long edge along your thigh. You'll move it to your shin after calibrating." },
          ].map((item, i) => (
            <View key={i} className="flex-row items-start gap-4">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: Colors.primary + "20" }}
              >
                <Text className="font-bold" style={{ color: Colors.primary }}>{i + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold mb-1" style={{ color: Colors.text }}>{item.label}</Text>
                <Text style={{ color: Colors.textSecondary }}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Placeholder illustration */}
        <View
          className="mt-8 rounded-2xl items-center justify-center"
          style={{ height: 120, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }}
        >
          <Ionicons name="body-outline" size={48} color={Colors.textMuted} />
          <Text className="text-xs mt-2" style={{ color: Colors.textMuted }}>Phone on thigh first, then shin</Text>
        </View>
      </View>

      <TouchableOpacity
        className="py-4 rounded-2xl items-center"
        style={{ backgroundColor: Colors.primary }}
        onPress={onReady}
      >
        <Text className="text-white font-bold text-base">I'm in position</Text>
      </TouchableOpacity>
    </View>
  );
}
