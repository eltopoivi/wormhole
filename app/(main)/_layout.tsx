import { useState, useCallback } from "react";
import { View, Platform, useWindowDimensions } from "react-native";
import { Redirect, Stack, router, usePathname } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { ServerBar } from "@/components/layout/ServerBar";
import { ChannelSidebar } from "@/components/layout/ChannelSidebar";
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

  const isDev = profile?.role === "dev";

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

  // Mobile: standard stack navigation
  if (!showSidebar) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bgBase },
          animation: "slide_from_right",
        }}
      />
    );
  }

  // Web wide: three-column layout
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: COLORS.bgBase }}>
      {/* Server Bar */}
      <ServerBar
        isDev={isDev}
        onSettingsPress={() => router.push("/(main)/admin/panel")}
      />

      {/* Channel Sidebar */}
      <ChannelSidebar
        activeChannelId={activeChannelId}
        onChannelPress={handleChannelPress}
        onSignOut={signOut}
      />

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.bgBase },
            animation: "none",
          }}
        />
      </View>
    </View>
  );
}
