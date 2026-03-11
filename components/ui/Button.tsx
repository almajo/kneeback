import { useRef } from "react";
import { Animated, TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import { Colors } from "../../constants/colors";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: Colors.primary, text: "#FFFFFF" },
  secondary: { bg: Colors.secondary, text: "#FFFFFF" },
  outline: { bg: "transparent", text: Colors.primary, border: Colors.primary },
  danger: { bg: Colors.error, text: "#FFFFFF" },
  ghost: { bg: "transparent", text: Colors.textSecondary },
};

const SIZE_STYLES: Record<Size, { height: number; fontSize: number; px: number }> = {
  sm: { height: 40, fontSize: 14, px: 16 },
  md: { height: 48, fontSize: 16, px: 20 },
  lg: { height: 56, fontSize: 17, px: 24 },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const styles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: isDisabled ? 0.5 : 1 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={{
          height: sizeStyles.height,
          paddingHorizontal: sizeStyles.px,
          backgroundColor: styles.bg,
          borderRadius: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderWidth: styles.border ? 1.5 : 0,
          borderColor: styles.border,
        }}
      >
        {loading ? (
          <ActivityIndicator color={styles.text} size="small" />
        ) : (
          <>
            {icon && <View>{icon}</View>}
            <Text
              style={{
                color: styles.text,
                fontSize: sizeStyles.fontSize,
                fontWeight: "700",
              }}
            >
              {label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
