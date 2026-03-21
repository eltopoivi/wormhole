import { useEffect, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatLoadingSkeleton } from "@/components/ui/Skeleton";
import { COLORS } from "@/lib/constants";
import type { ChannelMode, MessageWithProfile } from "@/types/database";

const WEB_BREAKPOINT = 768;

export default function ChannelScreen() {
  const { channelId, channelName, channelMode, channelIcon } = useLocalSearchParams<{
    channelId: string;
    channelName: string;
    channelMode: string;
    channelIcon: string;
  }>();

  const profile = useAuthStore((s) => s.profile);
  const {
    messages,
    isLoading,
    isSending,
    error: chatError,
    fetchMessages,
    sendMessage,
    toggleReaction,
    subscribeToChannel,
    clearMessages,
  } = useChatStore();

  const flatListRef = useRef<FlatList>(null);
  const [replyTo, setReplyTo] = useState<MessageWithProfile | null>(null);
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === "web" && width >= WEB_BREAKPOINT;

  const mode = channelMode as ChannelMode;
  const userRole = profile?.role ?? "member";

  const canWrite = (() => {
    if (userRole === "dev") return true;
    if (mode === "readonly" || mode === "verification" || mode === "disabled") return false;
    if (mode === "admin_write") return ["dev", "admin", "mod"].includes(userRole);
    if (mode === "public_chat") return true;
    if (mode === "private") return true;
    return false;
  })();

  const canReact = mode !== "readonly" && mode !== "verification" && mode !== "disabled";

  useEffect(() => {
    if (!channelId) return;
    fetchMessages(channelId);
    subscribeToChannel(channelId);
    return () => clearMessages();
  }, [channelId, fetchMessages, subscribeToChannel, clearMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(
    async (content: string) => {
      if (channelId) {
        try {
          await sendMessage(channelId, content, replyTo?.id);
          setReplyTo(null);
        } catch (err) {
          console.error("[ChannelScreen] Send failed:", err);
        }
      }
    },
    [channelId, sendMessage, replyTo]
  );

  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (canReact) toggleReaction(messageId, emoji);
    },
    [canReact, toggleReaction]
  );

  const shouldShowAvatar = useCallback(
    (index: number): boolean => {
      if (index === 0) return true;
      const prev = messages[index - 1];
      const curr = messages[index];
      if (prev.user_id !== curr.user_id) return true;
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(curr.created_at).getTime();
      return currTime - prevTime > 5 * 60 * 1000;
    },
    [messages]
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: MessageWithProfile; index: number }) => (
      <MessageBubble
        message={item}
        showAvatar={shouldShowAvatar(index)}
        canReact={canReact}
        canReply={canWrite}
        onReaction={handleReaction}
        onReply={() => setReplyTo(item)}
      />
    ),
    [shouldShowAvatar, canReact, canWrite, handleReaction]
  );

  const icon = channelIcon && channelIcon !== "#" ? channelIcon : null;

  const content = (
    <View style={{ flex: 1, backgroundColor: COLORS.bgBase }}>
      {/* Channel Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.bgBase,
        }}
      >
        {/* Back button (mobile only) */}
        {!isWide && (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              marginRight: 12,
              padding: 4,
              borderRadius: 4,
              backgroundColor: pressed ? COLORS.bgHover : "transparent",
              cursor: "pointer",
            } as any)}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
          </Pressable>
        )}

        {/* Channel info */}
        {icon ? (
          <Text style={{ fontSize: 18, marginRight: 6 }}>{icon}</Text>
        ) : (
          <Ionicons name="chatbox-ellipses-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 6 }} />
        )}
        <Text style={{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 16, marginRight: 8 }}>
          {channelName ?? "channel"}
        </Text>

        {/* Mode badge */}
        {(mode === "readonly" || mode === "admin_write") && (
          <View
            style={{
              backgroundColor: COLORS.bgElevated,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "600" }}>
              {mode === "readonly" ? "Read Only" : "Mod Only"}
            </Text>
          </View>
        )}

        {/* Spacer + right icons */}
        <View style={{ flex: 1 }} />
        <Pressable
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? COLORS.bgHover : "transparent",
          })}
        >
          <Ionicons name="people-outline" size={20} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <ChatLoadingSkeleton />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: messages.length === 0 ? "center" : "flex-end",
              paddingBottom: 8,
            }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingHorizontal: 40 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 34,
                    backgroundColor: COLORS.accentLight,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {icon ? (
                    <Text style={{ fontSize: 32 }}>{icon}</Text>
                  ) : (
                    <Ionicons name="chatbubbles" size={32} color={COLORS.accent} />
                  )}
                </View>
                <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: "800", marginBottom: 8 }}>
                  Welcome to #{channelName}!
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                  {mode === "readonly"
                    ? "This is a read-only channel. Content will be posted by admins."
                    : mode === "admin_write"
                    ? "Only moderators and admins can post here."
                    : `This is the beginning of #${channelName}. Send a message to start the conversation.`}
                </Text>
              </View>
            }
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            keyboardDismissMode="interactive"
          />
        )}

        {/* Error banner */}
        {chatError && (
          <View style={{ backgroundColor: COLORS.red, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: "#fff", fontSize: 12 }}>Error: {chatError}</Text>
          </View>
        )}

        {/* Reply indicator */}
        {replyTo && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: COLORS.bgElevated,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <Ionicons name="arrow-undo" size={14} color={COLORS.accent} style={{ marginRight: 8 }} />
            <Text style={{ color: COLORS.textMuted, fontSize: 12, flex: 1 }} numberOfLines={1}>
              Replying to{" "}
              <Text style={{ color: COLORS.textPrimary, fontWeight: "600" }}>
                {replyTo.profiles?.username}
              </Text>
              {"  "}
              {replyTo.content}
            </Text>
            <Pressable
              onPress={() => setReplyTo(null)}
              style={({ pressed }) => ({
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? COLORS.bgHover : "transparent",
                marginLeft: 8,
              })}
            >
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </Pressable>
          </View>
        )}

        {canWrite ? (
          <ChatInput
            channelName={channelName ?? "channel"}
            onSend={handleSend}
            isSending={isSending}
          />
        ) : (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              backgroundColor: COLORS.bgElevated,
            }}
          >
            <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center" }}>
              {mode === "readonly"
                ? "This channel is read-only"
                : mode === "admin_write"
                ? "Only mods can write in this channel"
                : "You don't have permission to send messages here"}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );

  // On mobile, wrap with SafeAreaView
  if (!isWide) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgBase }} edges={["top"]}>
        {content}
      </SafeAreaView>
    );
  }

  return content;
}
