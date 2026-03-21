import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Colors } from "../constants/colors";

export interface DataConflictModalProps {
  visible: boolean;
  onUseCloud: () => Promise<void>;
  onKeepLocal: () => Promise<void>;
  loading: boolean;
  onDismiss?: () => void;
}

export function DataConflictModal({
  visible,
  onUseCloud,
  onKeepLocal,
  loading,
  onDismiss,
}: DataConflictModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <View
          className="bg-surface rounded-2xl p-6 mx-6 w-full"
          style={{ maxWidth: 360 }}
        >
          <Text className="text-xl font-bold mb-2" style={{ color: "#2D2D2D" }}>
            You have data in both places
          </Text>
          <Text className="text-sm mb-6" style={{ color: "#6B6B6B" }}>
            This device has local recovery data, and your account also has
            existing cloud data. Which would you like to keep?
          </Text>

          <TouchableOpacity
            className={`bg-primary rounded-xl py-3 items-center mb-3 ${loading ? "opacity-50" : ""}`}
            onPress={onUseCloud}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                Use Cloud Data
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className={`rounded-xl py-3 items-center border border-border bg-background ${loading ? "opacity-50" : ""}`}
            onPress={onKeepLocal}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text className="font-bold text-base" style={{ color: "#2D2D2D" }}>
                Keep My Local Data
              </Text>
            )}
          </TouchableOpacity>

          <Text className="text-xs text-center mt-4" style={{ color: "#A0A0A0" }}>
            The other copy will be overwritten. This cannot be undone.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
