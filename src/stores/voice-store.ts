import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";

interface VoiceParticipant {
  userId: string;
  username: string;
  avatarUrl: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}

interface VoiceState {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  roomId: string | null;
  participants: VoiceParticipant[];
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;

  // Actions
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
}

// WebRTC config with free STUN servers
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Store peer connections by participant userId
const peerConnections = new Map<string, RTCPeerConnection>();
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export const useVoiceStore = create<VoiceState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  roomId: null,
  participants: [],
  localStream: null,
  screenStream: null,
  remoteStreams: new Map(),
  isMuted: false,
  isDeafened: false,
  isVideoOn: false,
  isScreenSharing: false,

  joinRoom: async (roomId: string) => {
    if (Platform.OS !== "web") return;
    if (get().isConnected || get().isConnecting) return;

    set({ isConnecting: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      set({ localStream: stream });

      const myInfo: VoiceParticipant = {
        userId: user.id,
        username: profile?.username ?? "Unknown",
        avatarUrl: profile?.avatar_url ?? null,
        isMuted: false,
        isDeafened: false,
        isVideoOn: false,
        isScreenSharing: false,
        isSpeaking: false,
      };

      // Set up Supabase Realtime channel for signaling + presence
      realtimeChannel = supabase.channel(`voice:${roomId}`, {
        config: { presence: { key: user.id } },
      });

      // Track presence (who's in the room)
      realtimeChannel.on("presence", { event: "sync" }, () => {
        const state = realtimeChannel!.presenceState();
        const participants: VoiceParticipant[] = [];
        for (const [, presences] of Object.entries(state)) {
          const p = (presences as any)[0];
          if (p) {
            participants.push({
              userId: p.userId,
              username: p.username,
              avatarUrl: p.avatarUrl,
              isMuted: p.isMuted ?? false,
              isDeafened: p.isDeafened ?? false,
              isVideoOn: p.isVideoOn ?? false,
              isScreenSharing: p.isScreenSharing ?? false,
              isSpeaking: false,
            });
          }
        }
        set({ participants });
      });

      // When someone joins, create peer connection to them
      realtimeChannel.on("presence", { event: "join" }, async ({ key, newPresences }) => {
        const joiner = (newPresences as any)[0];
        if (!joiner || joiner.userId === user.id) return;

        // Create offer to the new participant
        await createPeerConnection(joiner.userId, user.id, stream, true);
      });

      // When someone leaves, clean up their peer connection
      realtimeChannel.on("presence", { event: "leave" }, ({ key }) => {
        const pc = peerConnections.get(key);
        if (pc) {
          pc.close();
          peerConnections.delete(key);
          const streams = new Map(get().remoteStreams);
          streams.delete(key);
          set({ remoteStreams: streams });
        }
      });

      // Handle WebRTC signaling messages
      realtimeChannel.on("broadcast", { event: "signal" }, async ({ payload }) => {
        if (payload.target !== user.id) return;
        const senderId = payload.sender;

        if (payload.type === "offer") {
          await createPeerConnection(senderId, user.id, stream, false);
          const pc = peerConnections.get(senderId);
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          realtimeChannel!.send({
            type: "broadcast",
            event: "signal",
            payload: { type: "answer", sdp: answer, sender: user.id, target: senderId },
          });
        } else if (payload.type === "answer") {
          const pc = peerConnections.get(senderId);
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        } else if (payload.type === "ice-candidate") {
          const pc = peerConnections.get(senderId);
          if (pc && payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        }
      });

      await realtimeChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await realtimeChannel!.track({
            userId: user.id,
            username: myInfo.username,
            avatarUrl: myInfo.avatarUrl,
            isMuted: false,
            isDeafened: false,
            isVideoOn: false,
            isScreenSharing: false,
          });

          set({
            isConnected: true,
            isConnecting: false,
            roomId,
          });
        }
      });

      // Speech detection via audio analyser
      setupSpeechDetection(stream, (speaking) => {
        // Update local speaking state (visual indicator)
        const participants = get().participants.map((p) =>
          p.userId === user.id ? { ...p, isSpeaking: speaking } : p
        );
        set({ participants });
      });

    } catch (err) {
      console.error("[voice] Join error:", err);
      set({ isConnecting: false });
      // Clean up
      get().leaveRoom();
    }
  },

  leaveRoom: () => {
    const { localStream, screenStream } = get();

    // Stop all local streams
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());

    // Close all peer connections
    peerConnections.forEach((pc) => pc.close());
    peerConnections.clear();

    // Leave realtime channel
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
      realtimeChannel = null;
    }

    set({
      isConnected: false,
      isConnecting: false,
      roomId: null,
      participants: [],
      localStream: null,
      screenStream: null,
      remoteStreams: new Map(),
      isMuted: false,
      isDeafened: false,
      isVideoOn: false,
      isScreenSharing: false,
    });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    }
    set({ isMuted: !isMuted });
    updatePresence({ isMuted: !isMuted });
  },

  toggleDeafen: () => {
    const { isDeafened, remoteStreams } = get();
    const newDeafened = !isDeafened;

    // Mute/unmute all remote audio
    remoteStreams.forEach((stream) => {
      stream.getAudioTracks().forEach((t) => { t.enabled = !newDeafened; });
    });

    // If deafening, also mute
    if (newDeafened && !get().isMuted) {
      get().toggleMute();
    }

    set({ isDeafened: newDeafened });
    updatePresence({ isDeafened: newDeafened });
  },

  toggleVideo: async () => {
    const { isVideoOn, localStream } = get();

    if (isVideoOn) {
      // Turn off video
      localStream?.getVideoTracks().forEach((t) => {
        t.stop();
        localStream.removeTrack(t);
      });
      set({ isVideoOn: false });
      updatePresence({ isVideoOn: false });
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        localStream?.addTrack(videoTrack);

        // Add video track to all peer connections
        peerConnections.forEach((pc) => {
          pc.addTrack(videoTrack, localStream!);
        });

        set({ isVideoOn: true });
        updatePresence({ isVideoOn: true });
      } catch (err) {
        console.error("[voice] Video error:", err);
      }
    }
  },

  toggleScreenShare: async () => {
    const { isScreenSharing, screenStream } = get();

    if (isScreenSharing && screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      set({ isScreenSharing: false, screenStream: null });
      updatePresence({ isScreenSharing: false });
    } else {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: true,
        });

        // When user stops sharing via browser UI
        stream.getVideoTracks()[0].onended = () => {
          set({ isScreenSharing: false, screenStream: null });
          updatePresence({ isScreenSharing: false });
        };

        // Add screen tracks to all peer connections
        stream.getTracks().forEach((track: MediaStreamTrack) => {
          peerConnections.forEach((pc) => {
            pc.addTrack(track, stream);
          });
        });

        set({ isScreenSharing: true, screenStream: stream });
        updatePresence({ isScreenSharing: true });
      } catch (err) {
        console.error("[voice] Screen share error:", err);
      }
    }
  },
}));

/** Create a WebRTC peer connection to another participant */
async function createPeerConnection(
  remoteUserId: string,
  localUserId: string,
  localStream: MediaStream,
  isInitiator: boolean
) {
  // Don't recreate if already exists
  if (peerConnections.has(remoteUserId)) return;

  const pc = new RTCPeerConnection(RTC_CONFIG);
  peerConnections.set(remoteUserId, pc);

  // Add local audio tracks
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Handle remote stream
  pc.ontrack = (event) => {
    const remoteStream = event.streams[0];
    if (remoteStream) {
      const streams = new Map(useVoiceStore.getState().remoteStreams);
      streams.set(remoteUserId, remoteStream);
      useVoiceStore.setState({ remoteStreams: streams });

      // Auto-play remote audio
      if (Platform.OS === "web") {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.setAttribute("data-peer", remoteUserId);
      }
    }
  };

  // Send ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate && realtimeChannel) {
      realtimeChannel.send({
        type: "broadcast",
        event: "signal",
        payload: {
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
          sender: localUserId,
          target: remoteUserId,
        },
      });
    }
  };

  // If initiator, create and send offer
  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    realtimeChannel?.send({
      type: "broadcast",
      event: "signal",
      payload: {
        type: "offer",
        sdp: offer,
        sender: localUserId,
        target: remoteUserId,
      },
    });
  }
}

/** Update presence with new state */
async function updatePresence(updates: Record<string, any>) {
  if (!realtimeChannel) return;
  const state = useVoiceStore.getState();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const current = state.participants.find((p) => p.userId === user.id);
    if (!current) return;

    await realtimeChannel.track({
      userId: user.id,
      username: current.username,
      avatarUrl: current.avatarUrl,
      isMuted: state.isMuted,
      isDeafened: state.isDeafened,
      isVideoOn: state.isVideoOn,
      isScreenSharing: state.isScreenSharing,
      ...updates,
    });
  } catch (err) {
    console.error("[voice] Presence update error:", err);
  }
}

/** Detect speech from audio stream */
function setupSpeechDetection(stream: MediaStream, onSpeaking: (speaking: boolean) => void) {
  try {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 512;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;

    const check = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const isSpeaking = avg > 15;

      if (isSpeaking !== speaking) {
        speaking = isSpeaking;
        onSpeaking(speaking);
      }

      if (useVoiceStore.getState().isConnected) {
        requestAnimationFrame(check);
      } else {
        audioContext.close();
      }
    };

    check();
  } catch (err) {
    console.error("[voice] Speech detection error:", err);
  }
}
