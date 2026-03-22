import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: { username?: string; bio?: string; avatar_url?: string }) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      // onAuthStateChange triggers Supabase's internal init, which:
      // - Processes OAuth tokens from URL (if detectSessionInUrl: true)
      // - Loads session from storage
      // - Fires INITIAL_SESSION when done
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          await get().fetchProfile(session.user.id);
        } else {
          set({ profile: null });
        }
        // INITIAL_SESSION fires AFTER URL tokens have been processed
        if (event === "INITIAL_SESSION") {
          set({ isInitialized: true });
        }
      });

      // Fallback: if INITIAL_SESSION never fires, unblock after 4s
      setTimeout(() => {
        if (!get().isInitialized) {
          console.warn("[auth] INITIAL_SESSION timeout, forcing init");
          set({ isInitialized: true });
        }
      }, 4000);
    } catch (err) {
      console.error("[auth] initialize error:", err);
      set({ isInitialized: true });
    }
  },

  signUp: async (email, password, username) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;
      if (data.session) {
        set({ session: data.session, user: data.user });
        if (data.user) await get().fetchProfile(data.user.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ session: data.session, user: data.user });
      await get().fetchProfile(data.user.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithDiscord: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: typeof window !== "undefined"
            ? `${window.location.origin}/callback`
            : undefined,
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Discord sign in failed";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null, profile: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign out failed";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async (userId) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, is_verified, role, status, created_at, updated_at")
        .eq("id", userId)
        .single();

      if (data) {
        set({ profile: data as Profile });
        return;
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  },

  updateProfile: async (updates) => {
    const userId = get().user?.id;
    if (!userId) return;

    let avatarUrl = updates.avatar_url;

    const { error } = await supabase
      .from("profiles")
      .update({
        ...(updates.username ? { username: updates.username } : {}),
        ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
        ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    await get().fetchProfile(userId);
  },

  clearError: () => set({ error: null }),
}));
