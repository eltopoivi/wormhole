import { useState, useRef, useCallback, useEffect } from "react";
import { View, TextInput, Pressable, Text, Platform, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

interface MemberSuggestion {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface ChatInputProps {
  channelName: string;
  onSend: (content: string, imageFile?: File) => void;
  isSending: boolean;
}

export function ChatInput({ channelName, onSend, isSending }: ChatInputProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MemberSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allMembers, setAllMembers] = useState<MemberSuggestion[]>([]);
  const inputRef = useRef<TextInput>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch all members once for autocomplete
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .order("username")
      .then(({ data }) => {
        if (data) setAllMembers(data as MemberSuggestion[]);
      });
  }, []);

  // Filter suggestions when mention query changes
  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      return;
    }
    const q = mentionQuery.toLowerCase();
    const filtered = allMembers.filter((m) =>
      m.username.toLowerCase().includes(q)
    ).slice(0, 6);
    setSuggestions(filtered);
    setSelectedIndex(0);
  }, [mentionQuery, allMembers]);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);

    // Detect @mention trigger
    // Find the last @ that isn't preceded by a non-space char
    const cursorPos = newText.length; // approximate (works for typing at end)
    const beforeCursor = newText.substring(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf("@");

    if (atIndex >= 0) {
      // Check that @ is at start or preceded by whitespace
      const charBefore = atIndex > 0 ? beforeCursor[atIndex - 1] : " ";
      if (charBefore === " " || charBefore === "\n" || atIndex === 0) {
        const query = beforeCursor.substring(atIndex + 1);
        // Only show suggestions if no space in query (single word)
        if (!query.includes(" ") && query.length <= 20) {
          setMentionQuery(query);
          return;
        }
      }
    }
    setMentionQuery(null);
  }, []);

  const insertMention = useCallback((username: string) => {
    const atIndex = text.lastIndexOf("@");
    if (atIndex >= 0) {
      const before = text.substring(0, atIndex);
      const newText = `${before}@${username} `;
      setText(newText);
    }
    setMentionQuery(null);
    setSuggestions([]);
    inputRef.current?.focus();
  }, [text]);

  const handleSend = useCallback(() => {
    if ((!text.trim() && !imageFile) || isSending) return;
    onSend(text, imageFile ?? undefined);
    setText("");
    setImageFile(null);
    setImagePreview(null);
    setMentionQuery(null);
    inputRef.current?.focus();
  }, [text, imageFile, isSending, onSend]);

  const canSend = (text.trim().length > 0 || imageFile) && !isSending;

  const handleKeyPress = useCallback(
    (e: any) => {
      if (Platform.OS === "web") {
        const nativeEvent = e.nativeEvent;

        // Handle mention navigation
        if (suggestions.length > 0) {
          if (nativeEvent.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
            return;
          }
          if (nativeEvent.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
            return;
          }
          if (nativeEvent.key === "Tab" || (nativeEvent.key === "Enter" && !nativeEvent.shiftKey)) {
            e.preventDefault();
            insertMention(suggestions[selectedIndex].username);
            return;
          }
          if (nativeEvent.key === "Escape") {
            e.preventDefault();
            setMentionQuery(null);
            return;
          }
        }

        if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      }
    },
    [handleSend, suggestions, selectedIndex, insertMention]
  );

  const handleImagePick = useCallback(() => {
    if (Platform.OS === "web") {
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

      {/* Mention suggestions dropdown */}
      {suggestions.length > 0 && (
        <View
          style={{
            marginBottom: 4,
            backgroundColor: COLORS.bgFloat,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            overflow: "hidden",
            maxHeight: 240,
          }}
        >
          <ScrollView keyboardShouldPersistTaps="always">
            {suggestions.map((member, i) => (
              <Pressable
                key={member.id}
                onPress={() => insertMention(member.username)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: i === selectedIndex ? COLORS.bgHover : "transparent",
                  cursor: "pointer",
                } as any}
              >
                {/* Mini avatar */}
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: COLORS.bgActive,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                    overflow: "hidden",
                  }}
                >
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={{ width: 24, height: 24, borderRadius: 12 }}
                    />
                  ) : (
                    <Text style={{ color: COLORS.textPrimary, fontSize: 11, fontWeight: "700" }}>
                      {member.username.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: "500" }}>
                  {member.username}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
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
          onChangeText={handleTextChange}
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
