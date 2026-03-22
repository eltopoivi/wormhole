import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { useChannelStore } from "@/stores/channel-store";
import { Avatar } from "@/components/ui/Avatar";
import { VoiceChannelWidget } from "@/components/voice/VoiceChannel";
import { ChannelSkeleton } from "@/components/ui/Skeleton";
import { COLORS } from "@/lib/constants";
import type { Channel } from "@/types/database";

const WEB_BREAKPOINT = 768;

export default function ChannelsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isWide = isWeb && width >= WEB_BREAKPOINT;

  // On wide web, the sidebar handles channels — show welcome
  if (isWide) {
    return <WelcomeView />;
  }

  return <MobileChannelList />;
}

/** Welcome screen for wide web (no channel selected) */
function WelcomeView() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgBase }}>
      <View style={{ alignItems: "center", paddingHorizontal: 40 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: COLORS.accentLight,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 36 }}>🌀</Text>
        </View>
        <Text style={{ color: COLORS.textPrimary, fontSize: 24, fontWeight: "800", marginBottom: 8 }}>
          Welcome to WORMHOLE
        </Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
          Select a channel from the sidebar to start chatting
        </Text>
      </View>
    </View>
  );
}

/** Mobile channel list (full screen) */
function MobileChannelList() {
  const { profile, signOut } = useAuthStore();
  const { channels, isLoading, fetchChannels, fetchPrivateAccess, hasAccessToChannel } =
    useChannelStore();

  useEffect(() => {
    fetchChannels();
    fetchPrivateAccess();
  }, [fetchChannels, fetchPrivateAccess]);

  const userRole = profile?.role ?? "member";
  const isDev = userRole === "dev";

  const grouped: { category: string; items: Channel[] }[] = [];
  const seen = new Set<string>();
  for (const ch of channels) {
    if (!seen.has(ch.category)) {
      seen.add(ch.category);
      grouped.push({ category: ch.category, items: [] });
    }
    const group = grouped.find((g) => g.category === ch.category)!;
    if (ch.channel_mode === "verification") continue;
    // Show all channels on mobile (including private with lock icon)
    group.items.push(ch);
  }

  const handleChannelPress = useCallback((channel: Channel) => {
    if (channel.channel_mode === "disabled") return;
    router.push({
      pathname: "/(main)/channel/[channelId]",
      params: {
        channelId: channel.id,
        channelName: channel.name,
        channelMode: channel.channel_mode,
        channelIcon: channel.icon ?? "#",
      },
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgDark }} edges={["top", "bottom"]}>
      {/* Server Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: "800", fontSize: 15, letterSpacing: 0.3 }}>
          WORMHOLE
        </Text>
      </View>

      {/* Channel List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
        {isLoading && channels.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => <ChannelSkeleton key={i} />)
        ) : (
          grouped.filter((g) => g.items.length > 0).map((group) => (
            <View key={group.category}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 18, paddingBottom: 4 }}>
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
              </View>

              {group.items.map((ch) => {
                const isDisabled = ch.channel_mode === "disabled";
                const clickable = !isDisabled;

                return (
                  <Pressable
                    key={ch.id}
                    onPress={() => clickable && handleChannelPress(ch)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      height: 34,
                      paddingHorizontal: 8,
                      marginHorizontal: 8,
                      borderRadius: 4,
                      opacity: isDisabled ? 0.25 : 1,
                      backgroundColor: pressed && clickable ? COLORS.bgHover : "transparent",
                      cursor: clickable ? "pointer" : "auto",
                    } as any)}
                  >
                    <View style={{ width: 20, alignItems: "center", marginRight: 6 }}>
                      {ch.icon && ch.icon !== "#" ? (
                        <Text style={{ fontSize: 14 }}>{ch.icon}</Text>
                      ) : (
                        <Ionicons name="chatbox-ellipses-outline" size={16} color={COLORS.textMuted} />
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: isDisabled ? COLORS.textFaint : COLORS.textSecondary,
                      }}
                    >
                      {ch.name}
                    </Text>
                    {isDisabled && ch.topic && (
                      <Text style={{ color: COLORS.textFaint, fontSize: 9, fontStyle: "italic" }}>{ch.topic}</Text>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isDev && (
            <Pressable
              onPress={() => router.push("/(main)/admin/panel")}
              style={{ cursor: "pointer" } as any}
            >
              <Ionicons name="settings-outline" size={18} color={COLORS.textMuted} />
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              if (Platform.OS === "web") {
                if (window.confirm("Sign out?")) signOut();
              } else {
                Alert.alert("Sign Out", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sign Out", style: "destructive", onPress: signOut },
                ]);
              }
            }}
            style={{ cursor: "pointer" } as any}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
