import { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { usePost } from "../../lib/hooks/use-post";
import { PostTypeBadge } from "../../components/community/PostTypeBadge";
import { ReactionButton } from "../../components/community/ReactionButton";
import { CommentItem } from "../../components/community/CommentItem";
import { formatRelativeTime } from "../../lib/utils/format-time";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { post, comments, loading, submitting, addComment, toggleUpvote } = usePost(id);
  const [commentText, setCommentText] = useState("");
  const inputRef = useRef<TextInput>(null);

  async function handleSend() {
    const text = commentText.trim();
    if (!text || submitting) return;
    setCommentText("");
    await addComment(text);
  }

  function renderHeader() {
    if (!post) return null;

    const initial = (post.author_username?.[0] ?? "?").toUpperCase();

    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        {/* Type badge + timestamp */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <PostTypeBadge type={post.post_type} />
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>
            {formatRelativeTime(post.created_at)}
          </Text>
        </View>

        {/* Title */}
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.text, marginBottom: 10, lineHeight: 30 }}>
          {post.title}
        </Text>

        {/* Body */}
        <Text style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: 23, marginBottom: 16 }}>
          {post.body}
        </Text>

        {/* Author + upvote row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: Colors.borderLight,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: Colors.primary + "26",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.primary }}>
                {initial}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.textSecondary }}>
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
          <ReactionButton
            count={post.upvote_count}
            active={post.has_upvoted}
            onPress={toggleUpvote}
          />
        </View>

        {/* Replies label */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.8,
            color: Colors.textMuted,
            marginTop: 16,
            marginBottom: 4,
          }}
        >
          REPLIES ({comments.length})
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Back header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderLight,
          backgroundColor: Colors.surface,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/community")}
          style={{ padding: 8, flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
          <Text style={{ fontSize: 15, color: Colors.primary, fontWeight: "600" }}>
            Community
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CommentItem comment={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 16 }}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: Colors.borderLight, marginLeft: 58 }} />
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Text style={{ fontSize: 14, color: Colors.textMuted, fontStyle: "italic" }}>
              No replies yet — be the first to respond!
            </Text>
          </View>
        }
      />

      {/* Pinned comment bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: Colors.borderLight,
          backgroundColor: Colors.surface,
          gap: 10,
        }}
      >
        <TextInput
          ref={inputRef}
          style={{
            flex: 1,
            backgroundColor: Colors.background,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 15,
            color: Colors.text,
          }}
          placeholder="Add a reply…"
          placeholderTextColor={Colors.textMuted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!commentText.trim() || submitting}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor:
              commentText.trim() && !submitting ? Colors.primary : Colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
