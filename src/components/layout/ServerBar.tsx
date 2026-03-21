import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

interface ServerBarProps {
  onSettingsPress?: () => void;
  isDev?: boolean;
}

export function ServerBar({ onSettingsPress, isDev }: ServerBarProps) {
  return (
    <View
      style={{
        width: 72,
        backgroundColor: COLORS.bgDeepest,
        alignItems: "center",
        paddingTop: 12,
        paddingBottom: 12,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
      }}
    >
      {/* Wormhole server icon */}
      <Pressable
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: pressed ? 16 : 24,
          backgroundColor: COLORS.accent,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        })}
      >
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>W</Text>
      </Pressable>

      {/* Separator */}
      <View
        style={{
          width: 32,
          height: 2,
          backgroundColor: COLORS.border,
          borderRadius: 1,
          marginBottom: 8,
        }}
      />

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Dev settings */}
      {isDev && onSettingsPress && (
        <Pressable
          onPress={onSettingsPress}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: pressed ? COLORS.bgHover : COLORS.bgElevated,
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          } as any)}
        >
          <Ionicons name="settings-outline" size={22} color={COLORS.textMuted} />
        </Pressable>
      )}
    </View>
  );
}
