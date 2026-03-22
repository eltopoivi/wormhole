import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Channel } from "@/types/database";

interface ChannelState {
  channels: Channel[];
  privateAccessIds: string[];
  memberCount: number;
  isLoading: boolean;
  error: string | null;

  fetchChannels: () => Promise<void>;
  fetchPrivateAccess: () => Promise<void>;
  fetchMemberCount: () => Promise<void>;
  hasAccessToChannel: (channel: Channel, userRole: string) => boolean;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  privateAccessIds: [],
  memberCount: 0,
  isLoading: false,
  error: null,

  fetchChannels: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("position", { ascending: true });

      if (error) throw error;
      set({ channels: (data as unknown as Channel[]) ?? [] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch channels";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPrivateAccess: async () => {
    const { data } = await supabase
      .from("channel_access")
      .select("channel_id");

    if (data) {
      set({ privateAccessIds: data.map((d: any) => d.channel_id) });
    }
  },

  fetchMemberCount: async () => {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (!error && count !== null) {
      set({ memberCount: count });
    }
  },

  hasAccessToChannel: (channel, userRole) => {
    if (userRole === "dev") return true;
    if (channel.channel_mode === "disabled") return false;
    if (channel.channel_mode === "private") {
      return get().privateAccessIds.includes(channel.id);
    }
    return true;
  },
}));
