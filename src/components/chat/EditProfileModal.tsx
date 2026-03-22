import { useState, useRef } from "react";
import { View, Text, TextInput, Pressable, Image, Platform, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/ui/Avatar";
import { COLORS } from "@/lib/constants";

interface EditProfileModalProps {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { profile, user, updateProfile } = useAuthStore();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState((profile as any)?.bio ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickAvatar = () => {
    if (Platform.OS === "web") {
      if (!fileInputRef.current) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.display = "none";
        input.addEventListener("change", (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            if (file.size > 5 * 1024 * 1024) {
              setError("Avatar must be under 5MB");
              return;
            }
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
          }
        });
        document.body.appendChild(input);
        fileInputRef.current = input;
      }
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      let newAvatarUrl: string | undefined;

      // Upload new avatar if selected
      if (avatarFile && user) {
        const ext = avatarFile.name.split(".").pop() || "png";
        const path = `avatars/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-images")
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
        newAvatarUrl = urlData.publicUrl;
      }

      await updateProfile({
        username: username.trim(),
        bio: bio.trim() || "",
        ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {}),
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <View>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" }}>Edit Profile</Text>
        <Pressable onPress={onClose} style={{ cursor: "pointer" } as any}>
          <Ionicons name="close" size={22} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <View style={{ padding: 16 }}>
        {/* Avatar */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Pressable onPress={handlePickAvatar} style={{ cursor: "pointer" } as any}>
            <View style={{ position: "relative" }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  overflow: "hidden",
                  backgroundColor: COLORS.bgElevated,
                }}
              >
                {avatarPreview ? (
                  <Image source={{ uri: avatarPreview }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                ) : (
                  <Avatar name={username || "U"} size="lg" />
                )}
              </View>
              {/* Camera overlay */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: COLORS.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: COLORS.bgFloat,
                }}
              >
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </View>
          </Pressable>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 6 }}>Click to change avatar</Text>
        </View>

        {/* Username */}
        <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 }}>
          Username
        </Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={{
            backgroundColor: COLORS.bgElevated,
            color: COLORS.textPrimary,
            fontSize: 14,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 16,
            outlineStyle: "none",
          } as any}
          maxLength={32}
          placeholderTextColor={COLORS.textMuted}
          placeholder="Your username"
        />

        {/* Bio */}
        <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 }}>
          About Me
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={{
            backgroundColor: COLORS.bgElevated,
            color: COLORS.textPrimary,
            fontSize: 14,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 16,
            minHeight: 80,
            textAlignVertical: "top",
            outlineStyle: "none",
          } as any}
          multiline
          maxLength={200}
          placeholderTextColor={COLORS.textMuted}
          placeholder="Tell us about yourself..."
        />

        {/* Error */}
        {error && (
          <Text style={{ color: "#f47b67", fontSize: 12, marginBottom: 12 }}>{error}</Text>
        )}

        {/* Buttons */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: 6,
              backgroundColor: pressed ? COLORS.bgHover : COLORS.bgElevated,
              alignItems: "center",
              cursor: "pointer",
            } as any)}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: 6,
              backgroundColor: saving ? COLORS.bgActive : pressed ? COLORS.accentHover : COLORS.accent,
              alignItems: "center",
              cursor: saving ? "auto" : "pointer",
            } as any)}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (Platform.OS !== "web") {
    return (
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: COLORS.bgFloat, borderRadius: 12 }}>{content}</View>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 999 }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1000,
          width: 400,
          backgroundColor: COLORS.bgFloat,
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {content}
      </div>
    </>
  );
}
