import { useEffect, useRef } from "react";
import { View, Text, Pressable, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVoiceStore } from "@/stores/voice-store";
import { COLORS } from "@/lib/constants";

/**
 * Voice room view. Shows when user clicks energy room or is in a voice call.
 * Displays participant tiles (avatar or video), controls bar at bottom.
 */
export function VoiceRoomOverlay() {
  const {
    isConnected, participants, isVideoOn, isScreenSharing, showVoiceRoom,
    screenStream, localStream, remoteStreams,
    isMuted, isDeafened,
    toggleMute, toggleDeafen, toggleVideo, toggleScreenShare, leaveRoom,
  } = useVoiceStore();

  if (!isConnected || !showVoiceRoom) return null;

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
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Ionicons name="volume-high" size={20} color={COLORS.online} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" }}>energy room</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
            {participants.length} {participants.length === 1 ? "participant" : "participants"}
          </Text>
        </View>
      </View>

      {/* Main content area */}
      <View style={{ flex: 1, padding: 16 }}>
        {/* Screen share takes full area */}
        {isScreenSharing && screenStream ? (
          <View style={{ flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" }}>
            <VideoElement stream={screenStream} muted />
          </View>
        ) : (
          /* Participant grid — avatar tiles or video */
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", alignContent: "center" }}>
            {participants.map((p, index) => {
              const isLocal = index === 0; // First participant is usually self
              const hasVideo = isLocal ? isVideoOn : p.isVideoOn;
              const stream = isLocal ? localStream : remoteStreams.get(p.userId);

              return (
                <ParticipantTile
                  key={p.userId}
                  username={p.username}
                  avatarUrl={p.avatarUrl}
                  isMuted={isLocal ? isMuted : p.isMuted}
                  isSpeaking={p.isSpeaking}
                  hasVideo={hasVideo}
                  stream={hasVideo && stream ? stream : undefined}
                  mirrored={isLocal && hasVideo}
                />
              );
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

/** Participant tile — shows video if on, otherwise avatar */
function ParticipantTile({
  username,
  avatarUrl,
  isMuted,
  isSpeaking,
  hasVideo,
  stream,
  mirrored,
}: {
  username: string;
  avatarUrl: string | null;
  isMuted: boolean;
  isSpeaking: boolean;
  hasVideo: boolean;
  stream?: MediaStream;
  mirrored?: boolean;
}) {
  return (
    <View
      style={{
        width: 240,
        height: 240,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: COLORS.bgElevated,
        borderWidth: isSpeaking ? 3 : 1,
        borderColor: isSpeaking ? COLORS.online : COLORS.border,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {hasVideo && stream ? (
        <VideoElement stream={stream} muted={mirrored} mirrored={mirrored} />
      ) : (
        /* Avatar view */
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              overflow: "hidden",
              backgroundColor: COLORS.bgActive,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: isSpeaking ? 3 : 0,
              borderColor: COLORS.online,
            }}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
            ) : (
              <Text style={{ color: COLORS.textPrimary, fontSize: 32, fontWeight: "700" }}>
                {username.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: "600", marginTop: 12 }}>
            {username}
          </Text>
        </View>
      )}

      {/* Name + status overlay (for video mode) */}
      {hasVideo && (
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
      )}

      {/* Muted icon for avatar mode */}
      {!hasVideo && isMuted && (
        <View
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="mic-off" size={14} color="#f47b67" />
        </View>
      )}
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
  icon, label, active, danger, onPress,
}: {
  icon: string; label: string; active: boolean; danger?: boolean; onPress: () => void;
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
          width: 44, height: 44, borderRadius: 22,
          alignItems: "center", justifyContent: "center",
          backgroundColor: danger ? "rgba(231,76,60,0.2)" : active ? COLORS.bgActive : COLORS.bgElevated,
        }}
      >
        <Ionicons name={icon as any} size={20} color={danger ? "#e74c3c" : active ? COLORS.textPrimary : COLORS.textMuted} />
      </View>
      <Text style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 4 }}>{label}</Text>
    </Pressable>
  );
}
