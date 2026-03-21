import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { COLORS } from "@/lib/constants";

export default function CallbackScreen() {
  const [status, setStatus] = useState("Processing login...");
  const session = useAuthStore((s) => s.session);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  // When session appears in the store (set by onAuthStateChange or detectSessionInUrl),
  // fetch profile and redirect
  useEffect(() => {
    if (session?.user) {
      setStatus("Loading profile...");
      fetchProfile(session.user.id).then(() => {
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", "/");
        }
        router.replace("/(main)/channels");
      });
    }
  }, [session]);

  // Fallback: if detectSessionInUrl doesn't pick up tokens automatically,
  // try manual extraction from hash (implicit flow) or code (PKCE)
  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      if (typeof window === "undefined") return;

      const url = window.location;

      // Implicit flow: #access_token=...
      if (url.hash) {
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          setStatus("Setting session...");
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          // onAuthStateChange will fire -> session updates -> useEffect above redirects
          return;
        }
      }

      // PKCE flow: ?code=...
      if (url.search) {
        const params = new URLSearchParams(url.search);
        const code = params.get("code");

        if (code) {
          setStatus("Exchanging code...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // onAuthStateChange will fire -> session updates -> useEffect above redirects
          return;
        }
      }

      // No tokens or code in URL — check if session already exists
      setStatus("Checking session...");
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        // Session exists, the useEffect above should handle redirect
        return;
      }

      // Nothing worked — redirect to login after delay
      setStatus("No session found. Redirecting...");
      setTimeout(() => router.replace("/(auth)/login"), 2000);
    } catch (err: any) {
      console.error("[callback] Error:", err);
      setStatus(`Error: ${err.message || "Unknown error"}`);
      setTimeout(() => router.replace("/(auth)/login"), 3000);
    }
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgBase }}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 16 }}>{status}</Text>
    </View>
  );
}
