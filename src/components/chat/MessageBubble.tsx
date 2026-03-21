import { memo, useState, useCallback } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { format, isToday, isYesterday } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/ui/Avatar";
import { COLORS } from "@/lib/constants";
import type { MessageWithProfile } from "@/types/database";

interface MessageBubbleProps {
  message: MessageWithProfile;
  showAvatar: boolean;
  canReact: boolean;
  canReply: boolean;
  currentUserId?: string;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: () => void;
}

const QUICK_EMOJIS = ["⚡", "🔥", "❤️", "😂", "👍", "💀"];

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return `Today at ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return `Yesterday at ${format(date, "h:mm a")}`;
  return format(date, "MM/dd/yyyy h:mm a");
}

function formatCompactTime(dateStr: string): string {
  return format(new Date(dateStr), "h:mm a");
}

function getRoleColor(role: string): string {
  switch (role) {
    case "dev": return "#f47b67";
    case "admin": return "#fee75c";
    case "mod": return "#57f287";
    default: return COLORS.textPrimary;
  }
}

function getRoleBadge(role: string): string | null {
  switch (role) {
    case "dev": return "🛠";
    case "admin": return "⚡";
    case "mod": return "🛡";
    default: return null;
  }
}

/**
 * Hover wrapper that uses onMouseEnter/onMouseLeave on web
 * for reliable hover detection (no bubbling issues).
 */
function HoverRow({
  children,
  hovered,
  setHovered,
  isOwn,
  style,
}: {
  children: React.ReactNode;
  hovered: boolean;
  setHovered: (v: boolean) => void;
  isOwn?: boolean;
  style?: any;
}) {
  const bgDefault = isOwn ? "rgba(88, 101, 242, 0.06)" : "transparent";
  const bgHover = isOwn ? "rgba(88, 101, 242, 0.12)" : "rgba(255,255,255,0.04)";

  if (Platform.OS === "web") {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...style,
          backgroundColor: hovered ? bgHover : bgDefault,
        }}
      >
        {children}
      </div>
    );
  }
  return <View style={[style, { backgroundColor: bgDefault }]}>{children}</View>;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  showAvatar,
  canReact,
  canReply,
  currentUserId,
  onReaction,
  onReply,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const isOwn = currentUserId === message.user_id;
  const username = message.profiles?.username ?? "Unknown";
  const avatarUrl = message.profiles?.avatar_url;
  const role = (message.profiles as any)?.role ?? "member";
  const roleBadge = getRoleBadge(role);
  const replyData = message.reply_to as any;
  const reactions = message.reactions_grouped ?? [];

  const handleReact = useCallback(
    (emoji: string) => {
      onReaction(message.id, emoji);
      setShowEmojis(false);
    },
    [message.id, onReaction]
  );

  const isVisible = hovered || showEmojis;

  // Compact message (same author, <5min gap)
  if (!showAvatar) {
    return (
      <HoverRow
        hovered={isVisible}
        setHovered={setHovered}
        isOwn={isOwn}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 1,
          paddingBottom: 1,
          position: "relative",
        }}
      >
        {/* Timestamp on hover */}
        <View style={{ width: 40, marginRight: 12, alignItems: "center", justifyContent: "center" }}>
          {isVisible && (
            <Text style={{ color: COLORS.textFaint, fontSize: 10 }}>
              {formatCompactTime(message.created_at)}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, fontWeight: "500" }}>
            {message.content}
          </Text>
          {reactions.length > 0 && (
            <ReactionBar reactions={reactions} onReaction={handleReact} canReact={canReact} />
          )}
        </View>

        {/* Action toolbar */}
        {isVisible && (canReact || canReply) && (
          <ActionToolbar
            canReact={canReact}
            canReply={canReply}
            showEmojis={showEmojis}
            onToggleEmojis={() => setShowEmojis(!showEmojis)}
            onReply={() => { onReply(); setShowEmojis(false); }}
            onReact={handleReact}
          />
        )}
      </HoverRow>
    );
  }

  // Full message (with avatar)
  return (
    <HoverRow
      hovered={isVisible}
      setHovered={setHovered}
      style={{
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 12,
        paddingBottom: 2,
        position: "relative",
      }}
    >
      {/* Reply reference */}
      {replyData && (
        <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 52, marginBottom: 4 }}>
          <View
            style={{
              width: 16,
              height: 10,
              borderLeftWidth: 2,
              borderTopWidth: 2,
              borderColor: COLORS.textFaint,
              borderTopLeftRadius: 6,
              marginRight: 6,
            }}
          />
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }} numberOfLines={1}>
            <Text style={{ fontWeight: "600", color: COLORS.textSecondary }}>
              {replyData?.profiles?.username ?? "Unknown"}
            </Text>
            {"  "}
            {replyData?.content ?? ""}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: "row" }}>
        {/* Avatar */}
        <View style={{ marginRight: 12, width: 40 }}>
          <Avatar name={username} uri={avatarUrl} size="md" />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" }}>
            <Text style={{ color: getRoleColor(role), fontWeight: "600", fontSize: 15, marginRight: 4 }}>
              {username}
            </Text>
            {roleBadge && <Text style={{ fontSize: 11, marginRight: 4 }}>{roleBadge}</Text>}
            <Text style={{ color: COLORS.textFaint, fontSize: 11 }}>
              {formatMessageTime(message.created_at)}
            </Text>
          </View>

          <Text style={{ color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 2 }}>
            {message.content}
          </Text>

          {reactions.length > 0 && (
            <ReactionBar reactions={reactions} onReaction={handleReact} canReact={canReact} />
          )}
        </View>
      </View>

      {/* Action toolbar */}
      {isVisible && (canReact || canReply) && (
        <ActionToolbar
          canReact={canReact}
          canReply={canReply}
          showEmojis={showEmojis}
          onToggleEmojis={() => setShowEmojis(!showEmojis)}
          onReply={() => { onReply(); setShowEmojis(false); }}
          onReact={handleReact}
        />
      )}
    </HoverRow>
  );
});

/** Reaction pills below message */
function ReactionBar({
  reactions,
  onReaction,
  canReact,
}: {
  reactions: { emoji: string; count: number; reacted_by_me: boolean }[];
  onReaction: (emoji: string) => void;
  canReact: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
      {reactions.map((r) => (
        <Pressable
          key={r.emoji}
          onPress={() => canReact && onReaction(r.emoji)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: r.reacted_by_me ? COLORS.borderAccent : COLORS.border,
            backgroundColor: r.reacted_by_me ? COLORS.accentLight : COLORS.bgElevated,
            opacity: pressed ? 0.7 : 1,
            cursor: canReact ? "pointer" : "auto",
          } as any)}
          disabled={!canReact}
        >
          <Text style={{ fontSize: 13, marginRight: 4 }}>{r.emoji}</Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: r.reacted_by_me ? COLORS.accent : COLORS.textMuted,
            }}
          >
            {r.count}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Floating toolbar: react + reply + emoji picker */
function ActionToolbar({
  canReact,
  canReply,
  showEmojis,
  onToggleEmojis,
  onReply,
  onReact,
}: {
  canReact: boolean;
  canReply: boolean;
  showEmojis: boolean;
  onToggleEmojis: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
}) {
  return (
    <View style={{ position: "absolute", right: 12, top: 0, zIndex: 20 } as any}>
      {/* Main buttons */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: COLORS.bgFloat,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          overflow: "hidden",
        }}
      >
        {canReact && (
          <Pressable
            onPress={onToggleEmojis}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? COLORS.bgHover : "transparent",
              cursor: "pointer",
            } as any)}
          >
            <Text style={{ fontSize: 16 }}>⚡</Text>
          </Pressable>
        )}
        {canReply && (
          <Pressable
            onPress={onReply}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? COLORS.bgHover : "transparent",
              cursor: "pointer",
            } as any)}
          >
            <Ionicons name="arrow-undo" size={16} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Emoji picker dropdown */}
      {showEmojis && (
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 36,
            flexDirection: "row",
            flexWrap: "wrap",
            width: 148,
            gap: 2,
            backgroundColor: COLORS.bgFloat,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            padding: 6,
            zIndex: 30,
          }}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => onReact(emoji)}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                backgroundColor: pressed ? COLORS.bgHover : "transparent",
                cursor: "pointer",
              } as any)}
            >
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
