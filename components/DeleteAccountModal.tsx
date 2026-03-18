import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Colors } from "../constants/colors";

export interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
}

export function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
  deleting,
}: DeleteAccountModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <View
          className="bg-surface rounded-2xl p-6 mx-6 w-full"
          style={{ maxWidth: 360 }}
        >
          <Text
            className="text-xl font-bold mb-2"
            style={{ color: "#2D2D2D" }}
          >
            Delete Account?
          </Text>
          <Text className="text-base mb-6" style={{ color: "#6B6B6B" }}>
            This will permanently delete all your data including progress,
            logs, and achievements. This cannot be undone.
          </Text>
          <TouchableOpacity
            className={`rounded-xl py-3 items-center mb-3 ${deleting ? "opacity-50" : ""}`}
            style={{ backgroundColor: Colors.error }}
            onPress={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                Delete My Account
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-xl py-3 items-center bg-background border border-border"
            onPress={onClose}
            disabled={deleting}
          >
            <Text
              className="font-semibold text-base"
              style={{ color: "#2D2D2D" }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
