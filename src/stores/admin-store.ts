import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types/database";

interface AdminState {
  allUsers: Profile[];
  isLoading: boolean;
  error: string | null;

  fetchAllUsers: () => Promise<void>;
  setUserRole: (userId: string, role: UserRole) => Promise<void>;
  grantChannelAccess: (channelId: string, userId: string) => Promise<void>;
  revokeChannelAccess: (channelId: string, userId: string) => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  allUsers: [],
  isLoading: false,
  error: null,

  fetchAllUsers: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("username", { ascending: true });

    if (error) {
      set({ error: error.message, isLoading: false });
      return;
    }
    set({ allUsers: (data as unknown as Profile[]) ?? [], isLoading: false });
  },

  setUserRole: async (userId, role) => {
    set({ error: null });
    const { error } = await supabase
      .from("profiles")
      .update({ role } as any)
      .eq("id", userId);

    if (error) {
      set({ error: error.message });
      return;
    }
    await get().fetchAllUsers();
  },

  grantChannelAccess: async (channelId, userId) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("channel_access")
      .insert({ channel_id: channelId, user_id: userId, granted_by: user.id } as any);

    if (error && error.code !== "23505") {
      set({ error: error.message });
    }
  },

  revokeChannelAccess: async (channelId, userId) => {
    set({ error: null });
    const { error } = await supabase
      .from("channel_access")
      .delete()
      .eq("channel_id", channelId)
      .eq("user_id", userId);

    if (error) set({ error: error.message });
  },

  clearError: () => set({ error: null }),
}));
