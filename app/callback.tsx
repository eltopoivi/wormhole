import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { COLORS } from "@/lib/constants";

export default function CallbackScreen() {
  const [status, setStatus] = useState("Processing login...");
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      if (typeof window === "undefined") return;

      const url = window.location;
      let session = null;

      // Try hash fragment (implicit flow): #access_token=...
      if (url.hash) {
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          setStatus("Exchanging tokens...");
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          session = data.session;
        }
      }

      // Try query params (PKCE flow): ?code=...
      if (!session) {
        const params = new URLSearchParams(url.search);
        const code = params.get("code");

        if (code) {
          setStatus("Exchanging code...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          session = data.session;
        }
      }

      // If still no session, try getting existing one
      if (!session) {
        setStatus("Checking session...");
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      if (session?.user) {
        setStatus("Loading profile...");
        await fetchProfile(session.user.id);
        // Clean URL and go to channels
        window.history.replaceState(null, "", "/");
        router.replace("/(main)/channels");
      } else {
        setStatus("No session found. Redirecting...");
        setTimeout(() => router.replace("/(auth)/login"), 1500);
      }
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
