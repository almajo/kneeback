import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import type { PostType } from "../../lib/types";

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  question: { label: "Question", color: Colors.secondary, icon: "help-circle-outline" },
  milestone: { label: "Milestone", color: Colors.success, icon: "trophy-outline" },
  life_hack: { label: "Life Hack", color: Colors.primary, icon: "bulb-outline" },
};

interface Props {
  type: PostType;
}

export function PostTypeBadge({ type }: Props) {
  const config = POST_TYPE_CONFIG[type];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: config.color + "26",
        borderRadius: 100,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Ionicons name={config.icon} size={11} color={config.color} />
      <Text
        style={{
          color: config.color,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}
