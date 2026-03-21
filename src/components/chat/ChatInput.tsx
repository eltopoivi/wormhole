import { useState, useRef, useCallback } from "react";
import { View, TextInput, Pressable, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

interface ChatInputProps {
  channelName: string;
  onSend: (content: string) => void;
  isSending: boolean;
}

export function ChatInput({ channelName, onSend, isSending }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() || isSending) return;
    onSend(text);
    setText("");
    inputRef.current?.focus();
  }, [text, isSending, onSend]);

  const canSend = text.trim().length > 0 && !isSending;

  // On web: Enter sends, Shift+Enter adds newline
  const handleKeyPress = useCallback(
    (e: any) => {
      if (Platform.OS === "web") {
        const nativeEvent = e.nativeEvent;
        if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      }
    },
    [handleSend]
  );

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === "web" ? 16 : 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          backgroundColor: COLORS.bgElevated,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          paddingLeft: 6,
          paddingRight: 6,
          paddingVertical: 4,
          minHeight: 48,
        }}
      >
        {/* Plus button */}
        <Pressable
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? COLORS.bgHover : "transparent",
            marginBottom: 1,
          })}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.textMuted} />
        </Pressable>

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={{
            flex: 1,
            color: COLORS.textPrimary,
            fontSize: 15,
            maxHeight: 120,
            paddingVertical: 8,
            paddingHorizontal: 8,
            outlineStyle: "none",
          } as any}
          placeholder={`Message #${channelName}`}
          placeholderTextColor={COLORS.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          blurOnSubmit={false}
          onKeyPress={handleKeyPress}
          onSubmitEditing={handleSend}
        />

        {/* Emoji button */}
        <Pressable
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? COLORS.bgHover : "transparent",
            marginBottom: 1,
          })}
        >
          <Ionicons name="happy-outline" size={22} color={COLORS.textMuted} />
        </Pressable>

        {/* Send button */}
        <Pressable
          onPress={canSend ? handleSend : undefined}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: canSend
              ? pressed
                ? COLORS.accentHover
                : COLORS.accent
              : "transparent",
            marginBottom: 1,
            opacity: canSend ? 1 : 0.3,
            cursor: canSend ? "pointer" : "auto",
          } as any)}
        >
          <Ionicons
            name="send"
            size={18}
            color={canSend ? "#fff" : COLORS.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}
