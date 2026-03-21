import { useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { useChannelStore } from "@/stores/channel-store";
import { Avatar } from "@/components/ui/Avatar";
import { ChannelSkeleton } from "@/components/ui/Skeleton";
import { COLORS } from "@/lib/constants";
import type { Channel } from "@/types/database";

interface ChannelSidebarProps {
  activeChannelId?: string;
  onChannelPress: (channel: Channel) => void;
  onSignOut: () => void;
}

export function ChannelSidebar({ activeChannelId, onChannelPress, onSignOut }: ChannelSidebarProps) {
  const { profile } = useAuthStore();
  const { channels, isLoading, fetchChannels, fetchPrivateAccess, hasAccessToChannel } =
    useChannelStore();

  useEffect(() => {
    fetchChannels();
    fetchPrivateAccess();
  }, [fetchChannels, fetchPrivateAccess]);

  const userRole = profile?.role ?? "member";
  const isDev = userRole === "dev";

  // Group by category preserving order
  const grouped: { category: string; items: Channel[] }[] = [];
  const seen = new Set<string>();
  for (const ch of channels) {
    if (!seen.has(ch.category)) {
      seen.add(ch.category);
      grouped.push({ category: ch.category, items: [] });
    }
    const group = grouped.find((g) => g.category === ch.category)!;
    if (ch.channel_mode === "verification") continue;
    if (ch.channel_mode === "disabled") {
      group.items.push(ch);
    } else if (ch.channel_mode === "private" && !hasAccessToChannel(ch, userRole)) {
      if (isDev) group.items.push(ch);
    } else {
      group.items.push(ch);
    }
  }

  const handleSignOut = useCallback(() => {
    if (Platform.OS === "web") {
      if (window.confirm("Sign out?")) onSignOut();
    } else {
      Alert.alert("Sign Out", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: onSignOut },
      ]);
    }
  }, [onSignOut]);

  return (
    <View
      style={{
        width: 240,
        backgroundColor: COLORS.bgDark,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
      }}
    >
      {/* Server Header */}
      <Pressable
        style={({ pressed }) => ({
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          backgroundColor: pressed ? COLORS.bgHover : "transparent",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        })}
      >
        <Text style={{ color: COLORS.textPrimary, fontWeight: "800", fontSize: 15, letterSpacing: 0.3 }}>
          WORMHOLE
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </Pressable>

      {/* Channel List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
        {isLoading && channels.length === 0 ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <ChannelSkeleton key={i} />
            ))}
          </>
        ) : (
          grouped.filter((g) => g.items.length > 0).map((group) => (
            <View key={group.category}>
              {/* Category header */}
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 10,
                  paddingTop: 18,
                  paddingBottom: 4,
                }}
              >
                <Ionicons name="chevron-down" size={10} color={COLORS.textMuted} style={{ marginRight: 2 }} />
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 11,
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {group.category}
                </Text>
              </Pressable>

              {/* Channels */}
              {group.items.map((ch) => {
                const isDisabled = ch.channel_mode === "disabled";
                const isActive = ch.id === activeChannelId;
                const clickable = !isDisabled;

                return (
                  <Pressable
                    key={ch.id}
                    onPress={() => clickable && onChannelPress(ch)}
                    style={({ pressed, hovered }: any) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      height: 34,
                      paddingHorizontal: 8,
                      marginHorizontal: 8,
                      borderRadius: 4,
                      opacity: isDisabled ? 0.25 : 1,
                      backgroundColor: isActive
                        ? COLORS.bgActive
                        : hovered && clickable
                        ? COLORS.bgHover
                        : pressed && clickable
                        ? COLORS.bgHover
                        : "transparent",
                      cursor: clickable ? "pointer" : "auto",
                    } as any)}
                  >
                    {/* Channel icon */}
                    <View style={{ width: 20, alignItems: "center", marginRight: 6 }}>
                      {ch.icon && ch.icon !== "#" ? (
                        <Text style={{ fontSize: 14 }}>{ch.icon}</Text>
                      ) : (
                        <Ionicons
                          name={
                            ch.channel_mode === "private"
                              ? "lock-closed"
                              : "chatbox-ellipses-outline"
                          }
                          size={16}
                          color={isActive ? COLORS.textPrimary : COLORS.textMuted}
                        />
                      )}
                    </View>

                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: isActive ? "600" : "400",
                        color: isActive
                          ? COLORS.textPrimary
                          : isDisabled
                          ? COLORS.textFaint
                          : COLORS.textSecondary,
                      }}
                    >
                      {ch.name}
                    </Text>

                    {isDisabled && ch.topic && (
                      <Text style={{ color: COLORS.textFaint, fontSize: 9, fontStyle: "italic" }}>
                        {ch.topic}
                      </Text>
                    )}
                    {ch.channel_mode === "private" && (
                      <Ionicons name="lock-closed" size={12} color={COLORS.textFaint} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Bottom User Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 8,
          backgroundColor: COLORS.bgDeepest,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <Avatar name={profile?.username ?? "U"} uri={profile?.avatar_url} size="sm" />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
            {profile?.username ?? "User"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.online, marginRight: 4 }} />
            <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>Online</Text>
          </View>
        </View>
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? COLORS.bgHover : "transparent",
            cursor: "pointer",
          } as any)}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}
