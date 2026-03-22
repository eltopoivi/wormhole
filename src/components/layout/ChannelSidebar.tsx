import { useEffect, useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { useChannelStore } from "@/stores/channel-store";
import { Avatar } from "@/components/ui/Avatar";
import { EditProfileModal } from "@/components/chat/EditProfileModal";
import { VoiceChannelWidget } from "@/components/voice/VoiceChannel";
import { ChannelSkeleton } from "@/components/ui/Skeleton";
import { COLORS } from "@/lib/constants";
import type { Channel } from "@/types/database";

// Try to load banner gif, fallback to animated placeholder
let bannerSource: any = null;
try {
  bannerSource = require("../../../assets/wormhole.gif");
} catch {
  // gif doesn't exist yet
}

function WormholeBanner() {
  const [failed, setFailed] = useState(false);

  if (bannerSource && !failed) {
    return (
      <Image
        source={bannerSource}
        style={{ width: 208, height: 80, borderRadius: 12 }}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback: gradient-like placeholder with wormhole icon
  return (
    <View
      style={{
        width: 208,
        height: 80,
        borderRadius: 12,
        backgroundColor: "#1a1040",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 32 }}>🌀</Text>
      <Text style={{ color: "#8b7ec8", fontSize: 10, fontWeight: "700", marginTop: 2 }}>WORMHOLE</Text>
    </View>
  );
}

interface ChannelSidebarProps {
  activeChannelId?: string;
  onChannelPress: (channel: Channel) => void;
  onSignOut: () => void;
}

export function ChannelSidebar({ activeChannelId, onChannelPress, onSignOut }: ChannelSidebarProps) {
  const { profile } = useAuthStore();
  const { channels, isLoading, memberCount, fetchChannels, fetchPrivateAccess, fetchMemberCount, hasAccessToChannel } =
    useChannelStore();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    fetchChannels();
    fetchPrivateAccess();
    fetchMemberCount();
  }, [fetchChannels, fetchPrivateAccess, fetchMemberCount]);

  const userRole = profile?.role ?? "member";
  const isDev = userRole === "dev";

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

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

      {/* Wormhole Banner */}
      <View style={{ alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <View
          style={{
            width: 208,
            height: 80,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: COLORS.bgElevated,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WormholeBanner />
        </View>
      </View>

      {/* Member count bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <Ionicons name="people" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
        <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: "600" }}>
          {memberCount} {memberCount === 1 ? "Member" : "Members"}
        </Text>
      </View>

      {/* Channel List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
        {isLoading && channels.length === 0 ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <ChannelSkeleton key={i} />
            ))}
          </>
        ) : (
          grouped.filter((g) => g.items.length > 0).map((group) => {
            const isCollapsed = collapsedCategories.has(group.category);

            return (
              <View key={group.category}>
                {/* Category header — clickable to collapse */}
                <Pressable
                  onPress={() => toggleCategory(group.category)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 10,
                    paddingTop: 18,
                    paddingBottom: 4,
                    cursor: "pointer",
                    opacity: pressed ? 0.7 : 1,
                  } as any)}
                >
                  <Ionicons
                    name={isCollapsed ? "chevron-forward" : "chevron-down"}
                    size={10}
                    color={COLORS.textMuted}
                    style={{ marginRight: 2 }}
                  />
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

                {/* Channels — hidden when collapsed (except active channel) */}
                {!isCollapsed &&
                  group.items.map((ch) => {
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

                {/* When collapsed, still show active channel if it's in this group */}
                {isCollapsed &&
                  group.items
                    .filter((ch) => ch.id === activeChannelId)
                    .map((ch) => (
                      <Pressable
                        key={ch.id}
                        onPress={() => onChannelPress(ch)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          height: 34,
                          paddingHorizontal: 8,
                          marginHorizontal: 8,
                          borderRadius: 4,
                          backgroundColor: COLORS.bgActive,
                        }}
                      >
                        <View style={{ width: 20, alignItems: "center", marginRight: 6 }}>
                          {ch.icon && ch.icon !== "#" ? (
                            <Text style={{ fontSize: 14 }}>{ch.icon}</Text>
                          ) : (
                            <Ionicons name="chatbox-ellipses-outline" size={16} color={COLORS.textPrimary} />
                          )}
                        </View>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.textPrimary }}>
                          {ch.name}
                        </Text>
                      </Pressable>
                    ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Voice Channel */}
      <VoiceChannelWidget />

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
        <Pressable onPress={() => setShowEditProfile(true)} style={{ flexDirection: "row", alignItems: "center", flex: 1, cursor: "pointer" } as any}>
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
        </Pressable>
        {isDev && (
          <Pressable
            onPress={() => router.push("/(main)/admin/panel")}
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
            <Ionicons name="settings-outline" size={18} color={COLORS.textMuted} />
          </Pressable>
        )}
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

      {/* Edit profile modal */}
      {showEditProfile && (
        <EditProfileModal onClose={() => setShowEditProfile(false)} />
      )}
    </View>
  );
}
