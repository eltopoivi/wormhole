import { useCallback } from "react";
import { View, Platform, useWindowDimensions } from "react-native";
import { Redirect, Stack, router, usePathname } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { ChannelSidebar } from "@/components/layout/ChannelSidebar";
import { VoiceRoomOverlay } from "@/components/voice/VoiceRoom";
import { COLORS } from "@/lib/constants";
import type { Channel } from "@/types/database";

const WEB_BREAKPOINT = 768;

export default function MainLayout() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { width } = useWindowDimensions();
  const pathname = usePathname();

  const isWeb = Platform.OS === "web";
  const isWide = width >= WEB_BREAKPOINT;
  const showSidebar = isWeb && isWide;

  // Extract active channel ID from pathname
  const channelMatch = pathname.match(/\/channel\/([^/]+)/);
  const activeChannelId = channelMatch?.[1];

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

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Mobile: standard stack navigation + voice overlay
  if (!showSidebar) {
    return (
      <View style={{ flex: 1, position: "relative" } as any}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.bgBase },
            animation: "slide_from_right",
          }}
        />
        <VoiceRoomOverlay />
      </View>
    );
  }

  // Web wide: two-column layout (sidebar + chat)
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: COLORS.bgBase }}>
      {/* Channel Sidebar */}
      <ChannelSidebar
        activeChannelId={activeChannelId}
        onChannelPress={handleChannelPress}
        onSignOut={signOut}
      />

      {/* Main Content Area */}
      <View style={{ flex: 1, position: "relative" } as any}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.bgBase },
            animation: "none",
          }}
        />
        {/* Voice room overlay (shows when video/screen share active) */}
        <VoiceRoomOverlay />
      </View>
    </View>
  );
}
