import { useEffect, useRef } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVoiceStore } from "@/stores/voice-store";
import { Avatar } from "@/components/ui/Avatar";
import { COLORS } from "@/lib/constants";

/**
 * Full overlay for voice room when video or screen share is active.
 * Shows video feeds, screen shares, and participant grid.
 */
export function VoiceRoomOverlay() {
  const {
    isConnected, participants, isVideoOn, isScreenSharing,
    screenStream, localStream, remoteStreams,
    isMuted, isDeafened,
    toggleMute, toggleDeafen, toggleVideo, toggleScreenShare, leaveRoom,
  } = useVoiceStore();

  // Only show overlay if video or screen share is active
  if (!isConnected || (!isVideoOn && !isScreenSharing && !hasAnyVideo(participants))) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.bgDeepest,
        zIndex: 50,
      } as any}
    >
      {/* Main content area */}
      <View style={{ flex: 1, padding: 8 }}>
        {/* Screen share takes priority */}
        {isScreenSharing && screenStream ? (
          <View style={{ flex: 1, borderRadius: 8, overflow: "hidden", backgroundColor: "#000" }}>
            <VideoElement stream={screenStream} muted />
          </View>
        ) : (
          /* Participant grid */
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", alignItems: "center" }}>
            {/* Local video */}
            {isVideoOn && localStream && (
              <ParticipantTile
                username="You"
                isMuted={isMuted}
                isSpeaking={false}
                stream={localStream}
                mirrored
              />
            )}
            {/* Remote videos */}
            {participants
              .filter((p) => p.isVideoOn)
              .map((p) => {
                const stream = remoteStreams.get(p.userId);
                return stream ? (
                  <ParticipantTile
                    key={p.userId}
                    username={p.username}
                    isMuted={p.isMuted}
                    isSpeaking={p.isSpeaking}
                    stream={stream}
                  />
                ) : null;
              })}
          </View>
        )}
      </View>

      {/* Bottom controls bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          gap: 8,
          backgroundColor: COLORS.bgDark,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <BigControlButton
          icon={isMuted ? "mic-off" : "mic"}
          label={isMuted ? "Unmute" : "Mute"}
          active={!isMuted}
          danger={isMuted}
          onPress={toggleMute}
        />
        <BigControlButton
          icon={isDeafened ? "volume-mute" : "volume-high"}
          label={isDeafened ? "Undeafen" : "Deafen"}
          active={!isDeafened}
          danger={isDeafened}
          onPress={toggleDeafen}
        />
        <BigControlButton
          icon="videocam"
          label={isVideoOn ? "Stop Video" : "Video"}
          active={isVideoOn}
          onPress={toggleVideo}
        />
        <BigControlButton
          icon="desktop"
          label={isScreenSharing ? "Stop Share" : "Share Screen"}
          active={isScreenSharing}
          onPress={toggleScreenShare}
        />
        <Pressable
          onPress={leaveRoom}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? "#c0392b" : "#e74c3c",
            cursor: "pointer",
          } as any)}
        >
          <Ionicons name="call" size={22} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
        </Pressable>
      </View>
    </View>
  );
}

function ParticipantTile({
  username,
  isMuted,
  isSpeaking,
  stream,
  mirrored,
}: {
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  stream: MediaStream;
  mirrored?: boolean;
}) {
  return (
    <View
      style={{
        width: 320,
        height: 240,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#000",
        borderWidth: isSpeaking ? 2 : 0,
        borderColor: COLORS.online,
        position: "relative",
      }}
    >
      <VideoElement stream={stream} muted={mirrored} mirrored={mirrored} />
      <View
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}
      >
        {isMuted && <Ionicons name="mic-off" size={12} color="#f47b67" style={{ marginRight: 4 }} />}
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{username}</Text>
      </View>
    </View>
  );
}

/** Native video element for web */
function VideoElement({ stream, muted, mirrored }: { stream: MediaStream; muted?: boolean; mirrored?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (Platform.OS === "web" && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (Platform.OS !== "web") return null;

  return (
    <video
      ref={videoRef as any}
      autoPlay
      playsInline
      muted={muted}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: mirrored ? "scaleX(-1)" : "none",
      }}
    />
  );
}

function BigControlButton({
  icon,
  label,
  active,
  danger,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: pressed ? COLORS.bgHover : "transparent",
        cursor: "pointer",
      } as any)}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: danger ? "rgba(231,76,60,0.2)" : active ? COLORS.bgActive : COLORS.bgElevated,
        }}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={danger ? "#e74c3c" : active ? COLORS.textPrimary : COLORS.textMuted}
        />
      </View>
      <Text style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 4 }}>{label}</Text>
    </Pressable>
  );
}

function hasAnyVideo(participants: { isVideoOn: boolean; isScreenSharing: boolean }[]) {
  return participants.some((p) => p.isVideoOn || p.isScreenSharing);
}
