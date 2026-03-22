import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { MessageWithProfile } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChatState {
  messages: MessageWithProfile[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;

  fetchMessages: (channelId: string) => Promise<void>;
  sendMessage: (channelId: string, content: string, replyToId?: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  subscribeToChannel: (channelId: string) => void;
  unsubscribe: () => void;
  clearMessages: () => void;
}

const PAGE_SIZE = 50;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  realtimeChannel: null,

  fetchMessages: async (channelId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles:user_id(username, avatar_url, role),
          reply_to:reply_to_id(id, content, user_id, profiles:user_id(username))
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(PAGE_SIZE);

      if (error) throw error;

      // Fetch reactions for these messages
      const messageIds = (data ?? []).map((m: any) => m.id);
      let reactionsMap: Record<string, any[]> = {};

      if (messageIds.length > 0) {
        const { data: reactions } = await supabase
          .from("reactions")
          .select("message_id, emoji, user_id")
          .in("message_id", messageIds);

        if (reactions) {
          for (const r of reactions as any[]) {
            if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
            reactionsMap[r.message_id].push(r);
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      const myId = user?.id;

      const messagesWithReactions = (data ?? []).map((msg: any) => {
        const msgReactions = reactionsMap[msg.id] ?? [];
        const grouped: Record<string, { count: number; users: string[] }> = {};
        for (const r of msgReactions) {
          if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [] };
          grouped[r.emoji].count++;
          grouped[r.emoji].users.push(r.user_id);
        }
        return {
          ...msg,
          reactions_grouped: Object.entries(grouped).map(([emoji, data]) => ({
            emoji,
            count: data.count,
            reacted_by_me: data.users.includes(myId ?? ""),
          })),
        };
      });

      set({ messages: messagesWithReactions as unknown as MessageWithProfile[] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch messages";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (channelId, content, replyToId) => {
    if (!content.trim()) return;
    set({ isSending: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData: any = {
        channel_id: channelId,
        user_id: user.id,
        content: content.trim(),
      };
      if (replyToId) insertData.reply_to_id = replyToId;

      const { error } = await supabase.from("messages").insert(insertData as any);
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      console.error("[sendMessage] Error:", message, err);
      set({ error: message });
    } finally {
      set({ isSending: false });
    }
  },

  toggleReaction: async (messageId, emoji) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already reacted
      const { data: existing } = await supabase
        .from("reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .single();

      if (existing) {
        await supabase.from("reactions").delete().eq("id", (existing as any).id);
      } else {
        await supabase.from("reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        } as any);
      }

      // Refresh messages to get updated reaction counts
      const msg = get().messages.find((m) => m.id === messageId);
      const channelId = msg?.channel_id ?? get().messages[0]?.channel_id;
      if (channelId) await get().fetchMessages(channelId);
    } catch (err: unknown) {
      console.error("Failed to toggle reaction:", err);
    }
  },

  subscribeToChannel: (channelId) => {
    get().unsubscribe();

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async () => {
          // Re-fetch all messages to get profile joins and reactions
          await get().fetchMessages(channelId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
        },
        async () => {
          await get().fetchMessages(channelId);
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribe: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },

  clearMessages: () => {
    get().unsubscribe();
    set({ messages: [], error: null });
  },
}));
