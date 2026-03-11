import { View, Text } from "react-native";
import { Colors } from "../../constants/colors";
import { formatRelativeTime } from "../../lib/utils/format-time";
import type { CommunityComment } from "../../lib/types";

interface Props {
  comment: CommunityComment;
}

export function CommentItem({ comment }: Props) {
  const initial = (comment.author_username?.[0] ?? "?").toUpperCase();

  return (
    <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
      {/* Avatar */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: Colors.secondary + "26",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.secondary }}>
          {initial}
        </Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text }}>
            {comment.author_username}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>
            {formatRelativeTime(comment.created_at)}
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20 }}>
          {comment.body}
        </Text>
      </View>
    </View>
  );
}
