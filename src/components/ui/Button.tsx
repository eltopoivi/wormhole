import { Pressable, Text, ActivityIndicator, type ViewStyle } from "react-native";
import { COLORS } from "@/lib/constants";

interface ButtonProps {
  title: string;
  variant?: "primary" | "secondary" | "danger";
  isLoading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const VARIANT_COLORS = {
  primary: COLORS.accent,
  secondary: COLORS.bgElevated,
  danger: COLORS.red,
};

const VARIANT_HOVER = {
  primary: COLORS.accentHover,
  secondary: COLORS.bgHover,
  danger: "#d63638",
};

export function Button({
  title,
  variant = "primary",
  isLoading = false,
  disabled,
  onPress,
  style,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? VARIANT_HOVER[variant] : VARIANT_COLORS[variant],
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 13,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? "auto" : "pointer",
        ...style,
      })}
    >
      {isLoading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>{title}</Text>
      )}
    </Pressable>
  );
}
