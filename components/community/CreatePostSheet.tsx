import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Colors } from "../../constants/colors";
import type { PostType, CreatePostInput } from "../../lib/types";

const POST_TYPES: { type: PostType; label: string; emoji: string }[] = [
  { type: "question", label: "Question", emoji: "❓" },
  { type: "milestone", label: "Milestone", emoji: "🏆" },
  { type: "life_hack", label: "Life Hack", emoji: "💡" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePostInput) => Promise<void>;
}

export function CreatePostSheet({ visible, onClose, onSubmit }: Props) {
  const [postType, setPostType] = useState<PostType | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setPostType(null);
    setTitle("");
    setBody("");
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!postType || !title.trim() || !body.trim()) return;
    setSaving(true);
    await onSubmit({ post_type: postType, title: title.trim(), body: body.trim() });
    reset();
    onClose();
  }

  const canSubmit = !!postType && title.trim().length > 0 && body.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={handleClose}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: Colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 40,
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: Colors.border,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />

          <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.text, marginBottom: 16 }}>
            Share with Community
          </Text>

          {/* Type selector */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {POST_TYPES.map(({ type, label, emoji }) => {
              const selected = postType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setPostType(type)}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: 2,
                    backgroundColor: selected ? Colors.primary + "15" : Colors.surface,
                    borderColor: selected ? Colors.primary : Colors.border,
                  }}
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: selected ? Colors.primary : Colors.textSecondary,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                letterSpacing: 0.8,
                color: Colors.textMuted,
                marginBottom: 8,
              }}
            >
              TITLE
            </Text>
            <TextInput
              style={{
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: Colors.text,
                marginBottom: 16,
              }}
              placeholder="Give your post a title…"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Body */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                letterSpacing: 0.8,
                color: Colors.textMuted,
                marginBottom: 8,
              }}
            >
              DETAILS
            </Text>
            <TextInput
              style={{
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 15,
                color: Colors.text,
                minHeight: 100,
                textAlignVertical: "top",
                marginBottom: 24,
              }}
              placeholder="Share more details…"
              placeholderTextColor={Colors.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
            />

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit || saving}
              style={{
                backgroundColor: canSubmit ? Colors.primary : Colors.border,
                borderRadius: 14,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                {saving ? "Posting…" : "Post"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
