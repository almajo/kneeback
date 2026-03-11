import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { formatRelativeTime } from "../../lib/utils/format-time";
import { PostTypeBadge } from "./PostTypeBadge";
import { ReactionButton } from "./ReactionButton";
import type { CommunityPost } from "../../lib/types";

interface Props {
  post: CommunityPost;
  onPress: () => void;
  onUpvote: () => void;
}

export function PostCard({ post, onPress, onUpvote }: Props) {
  const initial = (post.author_username?.[0] ?? "?").toUpperCase();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <PostTypeBadge type={post.post_type} />
        <Text style={{ fontSize: 12, color: Colors.textMuted }}>
          {formatRelativeTime(post.created_at)}
        </Text>
      </View>

      {/* Title */}
      <Text
        style={{ fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 6 }}
        numberOfLines={2}
      >
        {post.title}
      </Text>

      {/* Body preview */}
      <Text
        style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 14 }}
        numberOfLines={2}
      >
        {post.body}
      </Text>

      {/* Footer */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {/* Author */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: Colors.primary + "26",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.primary }}>
              {initial}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: "500" }}>
            {post.author_username}
          </Text>
          {!!post.author_phase && (
            <View
              style={{
                backgroundColor: Colors.secondary + "20",
                borderRadius: 100,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "600", color: Colors.secondaryDark }}>
                {post.author_phase}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="chatbubble-outline" size={15} color={Colors.textMuted} />
            <Text style={{ fontSize: 13, color: Colors.textMuted, fontWeight: "600" }}>
              {post.comment_count}
            </Text>
          </View>
          <ReactionButton
            count={post.upvote_count}
            active={post.has_upvoted}
            onPress={onUpvote}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
