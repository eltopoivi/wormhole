import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { COLORS } from "@/lib/constants";

/**
 * OAuth callback page.
 *
 * With implicit flow + detectSessionInUrl, Supabase automatically processes
 * the #access_token from the URL hash during initialization.
 * The INITIAL_SESSION event fires with the session, updating the auth store.
 * This page just waits for the session to appear, then redirects.
 */
export default function CallbackScreen() {
  const session = useAuthStore((s) => s.session);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;

    if (isInitialized && session?.user) {
      redirected.current = true;
      // Clean the URL hash before navigating
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
      router.replace("/(main)/channels");
    } else if (isInitialized && !session) {
      // Initialized but no session — tokens weren't processed or auth failed
      // Give a bit more time in case of async delay, then redirect to login
      const timeout = setTimeout(() => {
        if (!redirected.current && !useAuthStore.getState().session) {
          redirected.current = true;
          router.replace("/(auth)/login");
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [session, isInitialized]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgBase }}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 16 }}>
        Logging you in...
      </Text>
    </View>
  );
}
