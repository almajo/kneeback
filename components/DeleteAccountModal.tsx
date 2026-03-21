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
  mode: "reset" | "delete";
}

export function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
  deleting,
  mode,
}: DeleteAccountModalProps) {
  const isReset = mode === "reset";

  const title = isReset ? "Reset App?" : "Delete Account?";
  const body = isReset
    ? "This will erase all your local recovery data and return you to the welcome screen. This cannot be undone."
    : "This will permanently delete your account and all data (local and cloud). This cannot be undone.";
  const buttonLabel = isReset ? "Reset Everything" : "Delete My Account";

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
            {title}
          </Text>
          <Text className="text-base mb-6" style={{ color: "#6B6B6B" }}>
            {body}
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
                {buttonLabel}
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
