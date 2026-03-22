import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { COLORS } from "@/lib/constants";

export default function CallbackScreen() {
  const session = useAuthStore((s) => s.session);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const redirected = useRef(false);
  const [debug, setDebug] = useState("");

  // Log the URL for debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      setDebug(url);
    }
  }, []);

  // Once auth store has a session, navigate to channels
  useEffect(() => {
    if (redirected.current) return;
    if (session?.user) {
      redirected.current = true;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
      router.replace("/(main)/channels");
    }
  }, [session]);

  // Fallback: if initialized with no session after a delay, try manual token extraction
  useEffect(() => {
    if (redirected.current) return;
    if (!isInitialized) return;

    // Give detectSessionInUrl a moment, then try manual extraction
    const timeout = setTimeout(async () => {
      if (redirected.current) return;
      if (useAuthStore.getState().session) return;

      // detectSessionInUrl didn't work — try manual extraction
      try {
        if (typeof window === "undefined") return;

        const hash = window.location.hash;
        const search = window.location.search;

        // Try implicit flow tokens from hash
        if (hash && hash.includes("access_token")) {
          const params: Record<string, string> = {};
          for (const part of hash.substring(1).split("&")) {
            const [k, v] = part.split("=");
            if (k && v) params[k] = decodeURIComponent(v);
          }
          if (params.access_token && params.refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
            if (!error) return; // onAuthStateChange will fire, useEffect will redirect
          }
        }

        // Try PKCE code from search params
        if (search && search.includes("code=")) {
          const code = new URLSearchParams(search).get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) return;
          }
        }
      } catch (e) {
        console.error("[callback] manual extraction failed:", e);
      }

      // Nothing worked — wait a bit more then go to login
      setTimeout(() => {
        if (!redirected.current && !useAuthStore.getState().session) {
          redirected.current = true;
          router.replace("/(auth)/login");
        }
      }, 3000);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isInitialized]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgBase }}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 16 }}>
        Logging you in...
      </Text>
      {/* Debug: show URL so we can see what tokens arrived */}
      {debug ? (
        <Text style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 24, paddingHorizontal: 20, textAlign: "center" }}>
          {debug.length > 200 ? debug.substring(0, 200) + "..." : debug}
        </Text>
      ) : null}
    </View>
  );
}
