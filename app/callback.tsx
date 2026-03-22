import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { COLORS } from "@/lib/constants";

export default function CallbackScreen() {
  const [status, setStatus] = useState("Processing login...");

  useEffect(() => {
    processOAuthTokens();
  }, []);

  async function processOAuthTokens() {
    try {
      if (typeof window === "undefined") {
        setStatus("Not running in browser");
        return;
      }

      const hash = window.location.hash;

      // Implicit flow: Discord redirects with #access_token=...&refresh_token=...
      if (hash && hash.includes("access_token")) {
        setStatus("Setting up session...");

        // Parse hash manually (don't rely on URL polyfill)
        const hashStr = hash.substring(1); // remove #
        const params: Record<string, string> = {};
        for (const part of hashStr.split("&")) {
          const [key, val] = part.split("=");
          if (key && val) params[key] = decodeURIComponent(val);
        }

        const accessToken = params["access_token"];
        const refreshToken = params["refresh_token"];

        if (!accessToken || !refreshToken) {
          setStatus("Missing tokens in URL");
          goToLogin();
          return;
        }

        // Set session with the tokens from Discord
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("[callback] setSession error:", error);
          setStatus("Auth error: " + error.message);
          goToLogin();
          return;
        }

        if (data.session?.user) {
          setStatus("Loading profile...");

          // Update auth store
          const store = useAuthStore.getState();
          await store.fetchProfile(data.session.user.id);

          // Clean URL and navigate
          window.history.replaceState(null, "", "/");
          router.replace("/(main)/channels");
          return;
        }

        setStatus("No session returned");
        goToLogin();
        return;
      }

      // PKCE flow fallback: ?code=...
      const search = window.location.search;
      if (search && search.includes("code=")) {
        setStatus("Exchanging code...");
        const code = new URLSearchParams(search).get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session?.user) {
            setStatus("Loading profile...");
            const store = useAuthStore.getState();
            await store.fetchProfile(data.session.user.id);
            window.history.replaceState(null, "", "/");
            router.replace("/(main)/channels");
            return;
          }
        }
      }

      // No tokens found — maybe session already exists
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.replace("/(main)/channels");
        return;
      }

      setStatus("No tokens found in URL");
      goToLogin();
    } catch (err: any) {
      console.error("[callback] Error:", err);
      setStatus("Error: " + (err.message || "Unknown"));
      goToLogin();
    }
  }

  function goToLogin() {
    setTimeout(() => router.replace("/(auth)/login"), 2000);
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgBase }}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 16 }}>{status}</Text>
    </View>
  );
}
