import "../global.css";
import { useEffect } from "react";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/stores/auth-store";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { COLORS } from "@/lib/constants";

export default function RootLayout() {
  const { isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bgBase }}>
      <StatusBar style="light" />
      <Slot />
    </GestureHandlerRootView>
  );
}
