// components/community/ShareWinPrompt.tsx
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
} from "react-native";
import { Colors } from "../../constants/colors";

interface Props {
  visible: boolean;
  winTitle: string;
  onShare: (message: string) => Promise<void>;
  onSkip: () => void;
}

export function ShareWinPrompt({ visible, winTitle, onShare, onSkip }: Props) {
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  function handleSkip() {
    setMessage("");
    onSkip();
  }

  async function handleShare() {
    setSharing(true);
    await onShare(message.trim());
    setMessage("");
    setSharing(false);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={handleSkip}
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

          <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.text, marginBottom: 4 }}>
            🎉 Celebrate your win!
          </Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 20 }}>
            Share this moment with the community.
          </Text>

          {/* Win title context */}
          <View
            style={{
              backgroundColor: Colors.success + "15",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: Colors.success + "40",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.success }}>
              ★ {winTitle}
            </Text>
          </View>

          {/* Message input */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.8,
              color: Colors.textMuted,
              marginBottom: 8,
            }}
          >
            ADD A MESSAGE (OPTIONAL)
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
              minHeight: 88,
              textAlignVertical: "top",
              marginBottom: 20,
            }}
            placeholder="How does it feel? Add a message…"
            placeholderTextColor={Colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
          />

          {/* Share button */}
          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing}
            style={{
              backgroundColor: Colors.success,
              borderRadius: 14,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              opacity: sharing ? 0.6 : 1,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
              {sharing ? "Sharing…" : "Share with Community"}
            </Text>
          </TouchableOpacity>

          {/* Skip link */}
          <TouchableOpacity onPress={handleSkip} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 15, color: Colors.textSecondary }}>Skip</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
