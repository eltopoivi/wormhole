import { useState, useRef, useCallback } from "react";
import { View, TextInput, Pressable, Text, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

interface ChatInputProps {
  channelName: string;
  onSend: (content: string, imageFile?: File) => void;
  isSending: boolean;
}

export function ChatInput({ channelName, onSend, isSending }: ChatInputProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSend = useCallback(() => {
    if ((!text.trim() && !imageFile) || isSending) return;
    onSend(text, imageFile ?? undefined);
    setText("");
    setImageFile(null);
    setImagePreview(null);
    inputRef.current?.focus();
  }, [text, imageFile, isSending, onSend]);

  const canSend = (text.trim().length > 0 || imageFile) && !isSending;

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

  const handleImagePick = useCallback(() => {
    if (Platform.OS === "web") {
      // Create hidden file input and click it
      if (!fileInputRef.current) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.display = "none";
        input.addEventListener("change", (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            if (file.size > 10 * 1024 * 1024) {
              alert("Image must be under 10MB");
              return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
          }
        });
        document.body.appendChild(input);
        fileInputRef.current = input;
      }
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
  }, []);

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === "web" ? 16 : 12,
      }}
    >
      {/* Image preview */}
      {imagePreview && (
        <View
          style={{
            marginBottom: 8,
            backgroundColor: COLORS.bgElevated,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            padding: 8,
            alignSelf: "flex-start",
          }}
        >
          <View style={{ position: "relative" }}>
            <Image
              source={{ uri: imagePreview }}
              style={{ width: 200, height: 150, borderRadius: 8 }}
              resizeMode="cover"
            />
            <Pressable
              onPress={removeImage}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "rgba(0,0,0,0.7)",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              } as any}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
            {imageFile?.name}
          </Text>
        </View>
      )}

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
        {/* Plus button — opens image picker */}
        <Pressable
          onPress={handleImagePick}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? COLORS.bgHover : "transparent",
            marginBottom: 1,
            cursor: "pointer",
          } as any)}
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

        {/* Image button */}
        <Pressable
          onPress={handleImagePick}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? COLORS.bgHover : "transparent",
            marginBottom: 1,
            cursor: "pointer",
          } as any)}
        >
          <Ionicons name="image-outline" size={22} color={COLORS.textMuted} />
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
