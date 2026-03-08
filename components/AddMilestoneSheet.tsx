import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "../constants/colors";
import { MILESTONE_TEMPLATES } from "../constants/milestone-templates";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (input: {
    title: string;
    category: "milestone" | "win";
    date: string;
    notes?: string;
    template_key?: string;
  }) => Promise<void>;
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function displayDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function AddMilestoneSheet({ visible, onClose, onSave }: Props) {
  const [category, setCategory] = useState<"milestone" | "win" | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setCategory(null);
    setTitle("");
    setDate(new Date());
    setShowAndroidPicker(false);
    setNotes("");
    setSelectedTemplate(null);
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function selectTemplate(key: string, label: string) {
    setSelectedTemplate(key);
    setTitle(label);
  }

  async function handleSave() {
    if (!category || !title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      category,
      date: toDateString(date),
      notes: notes.trim() || undefined,
      template_key: selectedTemplate || undefined,
    });
    reset();
    onClose();
  }

  const canSave = !!category && title.trim().length > 0;

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
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          className="bg-background rounded-t-3xl px-6 pt-4 pb-10"
        >
          {/* Handle */}
          <View className="w-10 h-1 rounded-full bg-border self-center mb-5" />

          <Text className="text-xl font-bold mb-4" style={{ color: Colors.text }}>
            Add to Timeline
          </Text>

          {/* Category chooser */}
          <View className="flex-row gap-3 mb-5">
            <TouchableOpacity
              className="flex-1 rounded-2xl py-4 items-center border-2"
              style={{
                backgroundColor: category === "milestone" ? Colors.primary + "15" : Colors.surface,
                borderColor: category === "milestone" ? Colors.primary : Colors.border,
              }}
              onPress={() => { setCategory("milestone"); setSelectedTemplate(null); setTitle(""); }}
            >
              <Text className="text-2xl mb-1">◆</Text>
              <Text className="font-bold text-sm" style={{ color: category === "milestone" ? Colors.primary : Colors.textSecondary }}>
                Milestone
              </Text>
              <Text className="text-xs text-center mt-1" style={{ color: Colors.textMuted }}>
                Upcoming event
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 rounded-2xl py-4 items-center border-2"
              style={{
                backgroundColor: category === "win" ? Colors.success + "15" : Colors.surface,
                borderColor: category === "win" ? Colors.success : Colors.border,
              }}
              onPress={() => { setCategory("win"); setDate(new Date()); setSelectedTemplate(null); setTitle(""); }}
            >
              <Text className="text-2xl mb-1">★</Text>
              <Text className="font-bold text-sm" style={{ color: category === "win" ? Colors.success : Colors.textSecondary }}>
                Win
              </Text>
              <Text className="text-xs text-center mt-1" style={{ color: Colors.textMuted }}>
                Personal highlight
              </Text>
            </TouchableOpacity>
          </View>

          {category !== null && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Preset templates (milestones only) */}
              {category === "milestone" && (
                <View className="mb-4">
                  <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
                    QUICK TEMPLATES
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {MILESTONE_TEMPLATES.map((t) => (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => selectTemplate(t.key, t.label)}
                        className="rounded-full px-3 py-1.5 border"
                        style={{
                          backgroundColor: selectedTemplate === t.key ? Colors.primary + "15" : Colors.surface,
                          borderColor: selectedTemplate === t.key ? Colors.primary : Colors.border,
                        }}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{ color: selectedTemplate === t.key ? Colors.primary : Colors.textSecondary }}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Title input */}
              <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
                {category === "win" ? "WHAT HAPPENED?" : "TITLE"}
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-2xl px-4 py-3 text-base mb-4"
                style={{ color: Colors.text }}
                placeholder={category === "win" ? "e.g. Put socks on myself!" : "Describe the milestone…"}
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={(t) => { setTitle(t); if (selectedTemplate) setSelectedTemplate(null); }}
              />

              {/* Date picker (milestones only) */}
              {category === "milestone" && (
                <View className="mb-4">
                  <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
                    DATE
                  </Text>
                  {Platform.OS === "android" ? (
                    <>
                      <TouchableOpacity
                        className="bg-surface border border-border rounded-2xl px-4 py-3"
                        onPress={() => setShowAndroidPicker(true)}
                      >
                        <Text className="text-base" style={{ color: Colors.text }}>{displayDate(date)}</Text>
                      </TouchableOpacity>
                      {showAndroidPicker && (
                        <DateTimePicker
                          value={date}
                          mode="date"
                          onChange={(_, selected) => {
                            setShowAndroidPicker(false);
                            if (selected) setDate(selected);
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <View className="bg-surface border border-border rounded-2xl px-2 items-center">
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="spinner"
                        onChange={(_, selected) => { if (selected) setDate(selected); }}
                        style={{ width: "100%" }}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Notes input */}
              <Text className="text-xs font-semibold tracking-wide mb-2" style={{ color: Colors.textMuted }}>
                NOTES (OPTIONAL)
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-2xl px-4 py-3 text-base mb-6"
                style={{ color: Colors.text, minHeight: 72, textAlignVertical: "top" }}
                placeholder="Any extra details…"
                placeholderTextColor={Colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              {/* Save button */}
              <TouchableOpacity
                className="rounded-2xl py-4 items-center"
                style={{
                  backgroundColor: canSave ? Colors.primary : Colors.border,
                  opacity: saving ? 0.6 : 1,
                }}
                onPress={handleSave}
                disabled={!canSave || saving}
              >
                <Text className="text-white font-bold text-base">
                  {saving ? "Saving…" : "Save"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
