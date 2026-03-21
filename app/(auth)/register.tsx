import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { COLORS } from "@/lib/constants";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { signUp, signInWithDiscord, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) return;
    try {
      await signUp(email.trim(), password, username.trim());
      router.replace("/(main)/channels");
    } catch {
      // Error shown via store
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: COLORS.bgDark }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
          <View style={{ width: "100%", maxWidth: 400 }}>
            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <Text style={{ color: COLORS.textPrimary, fontSize: 26, fontWeight: "800", marginBottom: 4 }}>
                Create an account
              </Text>
            </View>

            {error && (
              <Pressable onPress={clearError} style={{ marginBottom: 16 }}>
                <View
                  style={{
                    backgroundColor: "rgba(237,66,69,0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(237,66,69,0.3)",
                    borderRadius: 6,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: COLORS.red, fontSize: 13, textAlign: "center" }}>{error}</Text>
                </View>
              </Pressable>
            )}

            {/* Discord OAuth Button */}
            <Pressable
              onPress={signInWithDiscord}
              disabled={isLoading}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? "#4752c4" : "#5865f2",
                borderRadius: 8,
                paddingVertical: 13,
                marginBottom: 20,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? "auto" : "pointer",
                gap: 10,
              } as any)}
            >
              <Ionicons name="logo-discord" size={22} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                Continue with Discord
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
              <Text style={{ color: COLORS.textMuted, fontSize: 12, paddingHorizontal: 12 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
            </View>

            <View style={{ gap: 20 }}>
              <Input
                label="EMAIL"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
              />

              <Input
                label="USERNAME"
                placeholder="Enter a username"
                value={username}
                onChangeText={setUsername}
                autoComplete="username"
              />

              <Input
                label="PASSWORD"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />

              <Button
                title="Register"
                onPress={handleRegister}
                isLoading={isLoading}
                disabled={!email.trim() || !password.trim() || !username.trim()}
              />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              <Link href="/(auth)/login" asChild>
                <Pressable style={{ cursor: "pointer" } as any}>
                  <Text style={{ color: COLORS.textLink, fontSize: 13 }}>Already have an account?</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
