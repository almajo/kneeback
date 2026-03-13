import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { formatRelativeTime } from "../../lib/utils/format-time";
import { ReactionButton } from "./ReactionButton";
import type { CommunityComment } from "../../lib/types";

interface Props {
  comment: CommunityComment;
  currentUserId?: string;
  onUpvote: () => void;
  onDelete?: () => void;
  onEdit?: (body: string) => void;
}

export function CommentItem({ comment, currentUserId, onUpvote, onDelete, onEdit }: Props) {
  const initial = (comment.author_username?.[0] ?? "?").toUpperCase();
  const isOwner = !!currentUserId && comment.user_id === currentUserId;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body);

  function handleMenuPress() {
    Alert.alert("Comment", undefined, [
      {
        text: "Edit",
        onPress: () => {
          setEditText(comment.body);
          setEditing(true);
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete comment?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: onDelete },
          ]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleEditSave() {
    if (editText.trim() && editText.trim() !== comment.body) {
      onEdit?.(editText.trim());
    }
    setEditing(false);
  }

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
          {!!comment.author_phase && (
            <View
              style={{
                backgroundColor: Colors.secondary + "20",
                borderRadius: 100,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "600", color: Colors.secondaryDark }}>
                {comment.author_phase}
              </Text>
            </View>
          )}
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>
            {formatRelativeTime(comment.created_at)}
          </Text>
        </View>

        {editing ? (
          <View>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              style={{
                fontSize: 14,
                color: Colors.text,
                lineHeight: 20,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: Colors.background,
              }}
              multiline
              autoFocus
              maxLength={1000}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <TouchableOpacity onPress={handleEditSave}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.primary }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Text style={{ fontSize: 13, color: Colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20 }}>
            {comment.body}
          </Text>
        )}
      </View>

      {/* Actions column */}
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        {isOwner && !editing && (
          <TouchableOpacity onPress={handleMenuPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        <ReactionButton
          count={comment.upvote_count}
          active={comment.has_upvoted}
          onPress={onUpvote}
        />
      </View>
    </View>
  );
}
