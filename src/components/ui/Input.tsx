import { TextInput, View, Text, type TextInputProps } from "react-native";
import { COLORS } from "@/lib/constants";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View style={{ width: "100%" }}>
      {label && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
            color: error ? COLORS.red : COLORS.textSecondary,
          }}
        >
          {label}
          {error && (
            <Text style={{ color: COLORS.red, fontSize: 11, fontWeight: "400", textTransform: "none" }}>
              {" "}- {error}
            </Text>
          )}
        </Text>
      )}
      <TextInput
        style={{
          backgroundColor: COLORS.bgDeepest,
          borderRadius: 6,
          height: 44,
          paddingHorizontal: 12,
          color: COLORS.textPrimary,
          fontSize: 15,
          borderWidth: 1,
          borderColor: COLORS.inputBorder,
          outlineStyle: "none",
        } as any}
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
}
