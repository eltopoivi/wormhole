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
      // Step 1: If URL has OAuth tokens, extract and set session manually
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data.session) {
            set({ session: data.session, user: data.session.user });
            await get().fetchProfile(data.session.user.id);
            // Clean the URL hash
            window.history.replaceState(null, "", window.location.pathname);
          }

          // Set up listener for future changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            set({ session, user: session?.user ?? null });
            if (session?.user) {
              await get().fetchProfile(session.user.id);
            } else {
              set({ profile: null });
            }
          });

          set({ isInitialized: true });
          return;
        }
      }

      // Step 2: Normal flow — check stored session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ session, user: session.user });
        await get().fetchProfile(session.user.id);
      }

      // Listen for future auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          await get().fetchProfile(session.user.id);
        } else {
          set({ profile: null });
        }
      });
    } catch {
      set({ error: "Failed to initialize auth" });
    } finally {
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
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
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
        .select("id, username, avatar_url, is_verified, role, status, created_at, updated_at")
        .eq("id", userId)
        .single();

      if (data) {
        set({ profile: data as Profile });
        return;
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  },

  clearError: () => set({ error: null }),
}));
