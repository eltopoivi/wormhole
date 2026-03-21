export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          is_verified: boolean;
          role: "dev" | "admin" | "mod" | "member";
          status: "online" | "idle" | "dnd" | "offline";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          is_verified?: boolean;
          role?: "dev" | "admin" | "mod" | "member";
          status?: "online" | "idle" | "dnd" | "offline";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          is_verified?: boolean;
          role?: "dev" | "admin" | "mod" | "member";
          status?: "online" | "idle" | "dnd" | "offline";
          updated_at?: string;
        };
        Relationships: [];
      };
      channels: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: string;
          topic: string | null;
          icon: string | null;
          channel_mode: "readonly" | "admin_write" | "public_chat" | "private" | "verification" | "disabled";
          position: number;
          requires_verification: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          category: string;
          topic?: string | null;
          icon?: string | null;
          channel_mode?: "readonly" | "admin_write" | "public_chat" | "private" | "verification" | "disabled";
          position?: number;
          requires_verification?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          category?: string;
          topic?: string | null;
          icon?: string | null;
          channel_mode?: "readonly" | "admin_write" | "public_chat" | "private" | "verification" | "disabled";
          position?: number;
          requires_verification?: boolean;
        };
        Relationships: [];
      };
      channel_access: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          granted_by: string;
          granted_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          granted_by: string;
          granted_at?: string;
        };
        Update: {
          channel_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_access_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "channel_access_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          content: string;
          reply_to_id: string | null;
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          content: string;
          reply_to_id?: string | null;
          edited_at?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          edited_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_status: "online" | "idle" | "dnd" | "offline";
      user_role: "dev" | "admin" | "mod" | "member";
      channel_mode: "readonly" | "admin_write" | "public_chat" | "private" | "verification" | "disabled";
    };
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Channel = Database["public"]["Tables"]["channels"]["Row"];
export type ChannelAccess = Database["public"]["Tables"]["channel_access"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];

export type MessageWithProfile = Message & {
  profiles: Pick<Profile, "username" | "avatar_url" | "role">;
  reply_to?: (Message & { profiles: Pick<Profile, "username"> }) | null;
  reactions_grouped?: { emoji: string; count: number; reacted_by_me: boolean }[];
};

export type ChannelMode = Channel["channel_mode"];
export type UserRole = Profile["role"];
