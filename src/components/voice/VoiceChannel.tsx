import { View, Text, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVoiceStore } from "@/stores/voice-store";
import { Avatar } from "@/components/ui/Avatar";
import { COLORS } from "@/lib/constants";

const ROOM_ID = "energy-room";

export function VoiceChannelWidget() {
  const { isConnected, isConnecting, participants, showVoiceRoom, joinRoom, setShowVoiceRoom } = useVoiceStore();

  const handlePress = () => {
    if (isConnected) {
      // Toggle voice room view
      setShowVoiceRoom(!showVoiceRoom);
      return;
    }
    joinRoom(ROOM_ID);
  };

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border }}>
      {/* Channel header */}
      <Pressable
        onPress={handlePress}
        style={({ pressed, hovered }: any) => ({
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: hovered ? COLORS.bgHover : "transparent",
          cursor: "pointer",
        } as any)}
      >
        <Ionicons
          name="volume-high"
          size={18}
          color={isConnected ? COLORS.online : COLORS.textMuted}
          style={{ marginRight: 8 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: isConnected ? COLORS.online : COLORS.textSecondary,
              fontSize: 14,
              fontWeight: isConnected ? "600" : "400",
            }}
          >
            energy room
          </Text>
          {isConnecting && (
            <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>Connecting...</Text>
          )}
        </View>
        {!isConnected && (
          <Ionicons name="enter-outline" size={16} color={COLORS.textMuted} />
        )}
      </Pressable>

      {/* Participants in the voice channel */}
      {participants.length > 0 && (
        <View style={{ paddingLeft: 20, paddingBottom: 6 }}>
          {participants.map((p) => (
            <View
              key={p.userId}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 3,
                paddingHorizontal: 8,
              }}
            >
              {/* Speaking indicator ring */}
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: p.isSpeaking ? 2 : 0,
                  borderColor: COLORS.online,
                  marginRight: 8,
                  overflow: "hidden",
                }}
              >
                {p.avatarUrl ? (
                  <Image source={{ uri: p.avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                ) : (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.bgActive, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: COLORS.textPrimary, fontSize: 10, fontWeight: "700" }}>
                      {p.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={{
                  color: p.isSpeaking ? COLORS.online : COLORS.textSecondary,
                  fontSize: 13,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {p.username}
              </Text>

              {/* Status icons */}
              <View style={{ flexDirection: "row", gap: 2 }}>
                {p.isMuted && (
                  <Ionicons name="mic-off" size={12} color={COLORS.textFaint} />
                )}
                {p.isDeafened && (
                  <Ionicons name="volume-mute" size={12} color={COLORS.textFaint} />
                )}
                {p.isVideoOn && (
                  <Ionicons name="videocam" size={12} color={COLORS.online} />
                )}
                {p.isScreenSharing && (
                  <Ionicons name="desktop" size={12} color={COLORS.accent} />
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Voice controls bar (when connected) */}
      {isConnected && <VoiceControlsBar />}
    </View>
  );
}

/** Bottom controls: mute, deafen, video, screen share, disconnect */
function VoiceControlsBar() {
  const {
    isMuted, isDeafened, isVideoOn, isScreenSharing,
    toggleMute, toggleDeafen, toggleVideo, toggleScreenShare, leaveRoom,
  } = useVoiceStore();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
        gap: 4,
        backgroundColor: COLORS.bgDeepest,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
      }}
    >
      <ControlButton
        icon={isMuted ? "mic-off" : "mic"}
        active={!isMuted}
        onPress={toggleMute}
        activeColor={COLORS.textPrimary}
        inactiveColor="#f47b67"
        tooltip={isMuted ? "Unmute" : "Mute"}
      />
      <ControlButton
        icon={isDeafened ? "volume-mute" : "volume-high"}
        active={!isDeafened}
        onPress={toggleDeafen}
        activeColor={COLORS.textPrimary}
        inactiveColor="#f47b67"
        tooltip={isDeafened ? "Undeafen" : "Deafen"}
      />
      <ControlButton
        icon="videocam"
        active={isVideoOn}
        onPress={toggleVideo}
        activeColor={COLORS.online}
        inactiveColor={COLORS.textMuted}
        tooltip={isVideoOn ? "Turn off camera" : "Turn on camera"}
      />
      <ControlButton
        icon="desktop"
        active={isScreenSharing}
        onPress={toggleScreenShare}
        activeColor={COLORS.accent}
        inactiveColor={COLORS.textMuted}
        tooltip={isScreenSharing ? "Stop sharing" : "Share screen"}
      />

      {/* Disconnect button */}
      <Pressable
        onPress={leaveRoom}
        style={({ pressed }) => ({
          width: 32,
          height: 32,
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? "#d63031" : "#e74c3c",
          cursor: "pointer",
          marginLeft: 4,
        } as any)}
      >
        <Ionicons name="call" size={16} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
      </Pressable>
    </View>
  );
}

function ControlButton({
  icon,
  active,
  onPress,
  activeColor,
  inactiveColor,
  tooltip,
}: {
  icon: string;
  active: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
  tooltip: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: any) => ({
        width: 32,
        height: 32,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: hovered ? COLORS.bgHover : pressed ? COLORS.bgActive : "transparent",
        cursor: "pointer",
      } as any)}
    >
      <Ionicons name={icon as any} size={18} color={active ? activeColor : inactiveColor} />
    </Pressable>
  );
}
