import { useState } from "react";
import { Modal, View, Text, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

export interface OptionsMenuItem {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  items: OptionsMenuItem[];
  iconSize?: number;
  stopPropagation?: boolean;
}

export function OptionsMenu({ items, iconSize = 16, stopPropagation = false }: Props) {
  const [visible, setVisible] = useState(false);

  function handleTriggerPress(e: { stopPropagation?: () => void }) {
    if (stopPropagation) e.stopPropagation?.();
    setVisible(true);
  }

  function handleSelect(item: OptionsMenuItem) {
    setVisible(false);
    item.onPress();
  }

  return (
    <>
      <TouchableOpacity
        onPress={handleTriggerPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="ellipsis-horizontal" size={iconSize} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
          onPress={() => setVisible(false)}
        >
          <Pressable>
            <View
              style={{
                backgroundColor: Colors.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingTop: 8,
                paddingBottom: 34,
              }}
            >
              {/* Drag handle */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: Colors.border,
                  alignSelf: "center",
                  marginBottom: 12,
                }}
              />

              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => handleSelect(item)}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: Colors.borderLight,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      textAlign: "center",
                      color: item.destructive ? "#E53E3E" : Colors.text,
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Cancel */}
              <View style={{ height: 8, backgroundColor: Colors.borderLight, marginTop: 8 }} />
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={{ paddingVertical: 16, paddingHorizontal: 24 }}
              >
                <Text
                  style={{
                    fontSize: 17,
                    textAlign: "center",
                    color: Colors.textMuted,
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
