import { ActivityIndicator, Text, View } from "react-native";
import { Colors } from "../../constants/colors";

export default function MigrationScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text
        className="text-base mt-4 text-center"
        style={{ color: Colors.textSecondary }}
      >
        Moving your data to your device...
      </Text>
      <Text
        className="text-sm mt-2 text-center"
        style={{ color: Colors.textSecondary }}
      >
        This only happens once.
      </Text>
    </View>
  );
}
