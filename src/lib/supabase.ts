import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "@/types/database";

// Only import URL polyfill on native (it breaks Supabase's URL parsing on web)
if (Platform.OS !== "web") {
  require("react-native-url-polyfill/auto");
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// On web, use localStorage directly for reliable OAuth token persistence
const webStorage = {
  getItem: (key: string) => {
    const value = globalThis.localStorage?.getItem(key) ?? null;
    return Promise.resolve(value);
  },
  setItem: (key: string, value: string) => {
    globalThis.localStorage?.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    globalThis.localStorage?.removeItem(key);
    return Promise.resolve();
  },
};

const isWeb = Platform.OS === "web";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWeb ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, let Supabase auto-detect tokens from URL (PKCE code or implicit hash)
    detectSessionInUrl: isWeb,
  },
});
