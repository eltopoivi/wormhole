import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { useAdminStore } from "@/stores/admin-store";
import { useChannelStore } from "@/stores/channel-store";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { COLORS } from "@/lib/constants";
import type { Profile, UserRole, Channel } from "@/types/database";

const ROLES: { label: string; value: UserRole }[] = [
  { label: "👑 Dev", value: "dev" },
  { label: "⚡ Admin", value: "admin" },
  { label: "🛡 Mod", value: "mod" },
  { label: "👤 Member", value: "member" },
];

export default function AdminPanel() {
  const profile = useAuthStore((s) => s.profile);
  const { allUsers, isLoading, fetchAllUsers, setUserRole, grantChannelAccess, revokeChannelAccess } =
    useAdminStore();
  const { channels } = useChannelStore();

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  const privateChannels = channels.filter((c) => c.channel_mode === "private");

  useEffect(() => {
    if (profile?.role !== "dev") {
      Alert.alert("Access Denied", "Only devs can access this panel.");
      router.back();
      return;
    }
    fetchAllUsers();
  }, [profile, fetchAllUsers]);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    await setUserRole(userId, role);
    setShowRoleModal(false);
    setSelectedUser(null);
  };

  const handleGrantAccess = async (channel: Channel) => {
    if (!selectedUser) return;
    await grantChannelAccess(channel.id, selectedUser.id);
    Alert.alert("Done", `${selectedUser.username} now has access to #${channel.name}`);
  };

  const handleRevokeAccess = async (channel: Channel) => {
    if (!selectedUser) return;
    await revokeChannelAccess(channel.id, selectedUser.id);
    Alert.alert("Done", `${selectedUser.username} no longer has access to #${channel.name}`);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "dev": return "👑";
      case "admin": return "⚡";
      case "mod": return "🛡";
      default: return "👤";
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgDark }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            marginRight: 12,
            padding: 4,
            borderRadius: 4,
            backgroundColor: pressed ? COLORS.bgHover : "transparent",
            cursor: "pointer",
          } as any)}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
        </Pressable>
        <Ionicons name="settings-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <Text style={{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 18 }}>Admin Panel</Text>
      </View>

      {/* User list */}
      <FlatList
        data={allUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            All Users ({allUsers.length})
          </Text>
        }
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgElevated, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
            <Avatar name={item.username} uri={item.avatar_url} size="md" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: "600", fontSize: 14 }}>
                  {item.username}
                </Text>
                <Text style={{ fontSize: 12, marginLeft: 4 }}>{getRoleBadge(item.role)}</Text>
              </View>
              <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>
                {item.role}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => { setSelectedUser(item); setShowRoleModal(true); }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? COLORS.bgHover : COLORS.bgFloat,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  cursor: "pointer",
                } as any)}
              >
                <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Role</Text>
              </Pressable>

              {privateChannels.length > 0 && (
                <Pressable
                  onPress={() => { setSelectedUser(item); setShowAccessModal(true); }}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? COLORS.bgHover : COLORS.bgFloat,
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    cursor: "pointer",
                  } as any)}
                >
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Access</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
        refreshing={isLoading}
        onRefresh={fetchAllUsers}
      />

      {/* Role Modal */}
      <Modal visible={showRoleModal} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: COLORS.bgElevated, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 4 }}>
              Change Role
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 16 }}>
              {selectedUser?.username}
            </Text>
            <View style={{ gap: 8 }}>
              {ROLES.map((r) => (
                <Pressable
                  key={r.value}
                  onPress={() => selectedUser && handleRoleChange(selectedUser.id, r.value)}
                  style={({ pressed }) => ({
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: selectedUser?.role === r.value ? COLORS.accentLight : COLORS.bgFloat,
                    borderWidth: 1,
                    borderColor: selectedUser?.role === r.value ? COLORS.borderAccent : COLORS.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: COLORS.textPrimary, textAlign: "center" }}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => { setShowRoleModal(false); setSelectedUser(null); }}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* Access Modal */}
      <Modal visible={showAccessModal} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: COLORS.bgElevated, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 4 }}>
              Channel Access
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 16 }}>
              {selectedUser?.username}
            </Text>
            <View style={{ gap: 8 }}>
              {privateChannels.map((ch) => (
                <View key={ch.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.bgFloat, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ color: COLORS.textSecondary }}>
                    {ch.icon} {ch.name}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => handleGrantAccess(ch)}
                      style={({ pressed }) => ({
                        backgroundColor: "rgba(87,242,135,0.15)",
                        borderRadius: 4,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ color: COLORS.green, fontSize: 12, fontWeight: "600" }}>Grant</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRevokeAccess(ch)}
                      style={({ pressed }) => ({
                        backgroundColor: "rgba(237,66,69,0.15)",
                        borderRadius: 4,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: "600" }}>Revoke</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            <Button
              title="Close"
              variant="secondary"
              onPress={() => { setShowAccessModal(false); setSelectedUser(null); }}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
