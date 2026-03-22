import { useEffect, useState } from "react";
import { View, Text, Pressable, Image, Platform, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/ui/Avatar";
import { COLORS } from "@/lib/constants";
import { format } from "date-fns";

interface ProfileCardProps {
  userId: string;
  onClose: () => void;
  isOwnProfile: boolean;
  onEditProfile?: () => void;
  /** Position hint for card placement */
  anchorY?: number;
}

interface FullProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  status: string;
  is_verified: boolean;
  created_at: string;
}

function getRoleLabel(role: string) {
  switch (role) {
    case "dev": return { label: "Developer", color: "#f47b67", icon: "🛠" };
    case "admin": return { label: "Admin", color: "#fee75c", icon: "⚡" };
    case "mod": return { label: "Moderator", color: "#57f287", icon: "🛡" };
    default: return { label: "Member", color: COLORS.textSecondary, icon: null };
  }
}

export function ProfileCard({ userId, onClose, isOwnProfile, onEditProfile }: ProfileCardProps) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, role, status, is_verified, created_at")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as FullProfile);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <CardWrapper onClose={onClose}>
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      </CardWrapper>
    );
  }

  if (!profile) {
    return (
      <CardWrapper onClose={onClose}>
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: COLORS.textMuted }}>User not found</Text>
        </View>
      </CardWrapper>
    );
  }

  const roleInfo = getRoleLabel(profile.role);
  const joinDate = format(new Date(profile.created_at), "MMM d, yyyy");

  return (
    <CardWrapper onClose={onClose}>
      {/* Banner area */}
      <View
        style={{
          height: 60,
          backgroundColor: profile.role === "dev" ? "#f47b67" : profile.role === "admin" ? "#fee75c" : COLORS.accent,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          opacity: 0.6,
        }}
      />

      {/* Avatar overlapping banner */}
      <View style={{ paddingHorizontal: 16, marginTop: -30 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 4,
            borderColor: COLORS.bgFloat,
            overflow: "hidden",
            backgroundColor: COLORS.bgElevated,
          }}
        >
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : (
            <Avatar name={profile.username} size="lg" />
          )}
        </View>
      </View>

      {/* Profile info */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
        {/* Username + badge */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: "700" }}>
            {profile.username}
          </Text>
          {profile.is_verified && (
            <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} style={{ marginLeft: 4 }} />
          )}
        </View>

        {/* Role badge */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          {roleInfo.icon && <Text style={{ fontSize: 12, marginRight: 4 }}>{roleInfo.icon}</Text>}
          <Text style={{ color: roleInfo.color, fontSize: 12, fontWeight: "600" }}>{roleInfo.label}</Text>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 10 }} />

        {/* Bio */}
        {profile.bio ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 }}>
              About Me
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 }}>
              {profile.bio}
            </Text>
          </View>
        ) : null}

        {/* Member since */}
        <View style={{ marginBottom: isOwnProfile ? 12 : 0 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 }}>
            Member Since
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
            {joinDate}
          </Text>
        </View>

        {/* Edit button for own profile */}
        {isOwnProfile && onEditProfile && (
          <Pressable
            onPress={onEditProfile}
            style={({ pressed }) => ({
              marginTop: 4,
              paddingVertical: 8,
              borderRadius: 6,
              backgroundColor: pressed ? COLORS.accentHover : COLORS.accent,
              alignItems: "center",
              cursor: "pointer",
            } as any)}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Edit Profile</Text>
          </Pressable>
        )}
      </View>
    </CardWrapper>
  );
}

/** Wrapper: backdrop + card container */
function CardWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  if (Platform.OS !== "web") {
    return (
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ position: "absolute", top: 80, left: 20, right: 20, backgroundColor: COLORS.bgFloat, borderRadius: 12 }}>
            {children}
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }}
      />
      {/* Card */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1000,
          width: 320,
          backgroundColor: COLORS.bgFloat,
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </>
  );
}
