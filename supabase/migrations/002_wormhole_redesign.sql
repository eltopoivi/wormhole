-- ============================================
-- Wormhole Redesign — Single Server Architecture
-- Run this AFTER dropping the old schema or on a fresh DB
-- ============================================

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;
DROP TABLE IF EXISTS public.server_members CASCADE;
DROP TABLE IF EXISTS public.servers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop ALL types (old + new, in case of partial run)
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS member_role CASCADE;
DROP TYPE IF EXISTS channel_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS channel_mode CASCADE;

-- Drop old functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_server() CASCADE;
DROP FUNCTION IF EXISTS public.verify_user(UUID) CASCADE;

-- Drop new tables too (in case of partial run)
DROP TABLE IF EXISTS public.reactions CASCADE;
DROP TABLE IF EXISTS public.channel_access CASCADE;

-- ============================================
-- New enum types
-- ============================================
CREATE TYPE user_status AS ENUM ('online', 'idle', 'dnd', 'offline');
CREATE TYPE user_role AS ENUM ('dev', 'admin', 'mod', 'member');
CREATE TYPE channel_mode AS ENUM ('readonly', 'admin_write', 'public_chat', 'private', 'verification', 'disabled');

-- ============================================
-- 1. Profiles
-- ============================================
CREATE TABLE public.profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username      TEXT NOT NULL UNIQUE,
    avatar_url    TEXT,
    is_verified   BOOLEAN NOT NULL DEFAULT false,
    role          user_role NOT NULL DEFAULT 'member',
    status        user_status NOT NULL DEFAULT 'offline',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 2. Channels (no server_id — single server)
-- ============================================
CREATE TABLE public.channels (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT NOT NULL,
    slug                  TEXT NOT NULL UNIQUE,
    category              TEXT NOT NULL DEFAULT 'WORMHOLE',
    topic                 TEXT,
    icon                  TEXT,
    channel_mode          channel_mode NOT NULL DEFAULT 'public_chat',
    position              INT NOT NULL DEFAULT 0,
    requires_verification BOOLEAN NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. Channel Access (for private channels)
-- ============================================
CREATE TABLE public.channel_access (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id  UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (channel_id, user_id)
);

-- ============================================
-- 4. Messages (with reply support)
-- ============================================
CREATE TABLE public.messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id  UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    edited_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 5. Reactions
-- ============================================
CREATE TABLE public.reactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (message_id, user_id, emoji)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_messages_channel_created ON public.messages (channel_id, created_at DESC);
CREATE INDEX idx_reactions_message ON public.reactions (message_id);
CREATE INDEX idx_channel_access_channel ON public.channel_access (channel_id);
CREATE INDEX idx_channel_access_user ON public.channel_access (user_id);
CREATE INDEX idx_channels_position ON public.channels (category, position);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Devs can update any profile (for role assignment)
CREATE POLICY "Devs can update any profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev')
    );

-- Channels: all authenticated can see channels
CREATE POLICY "Channels are viewable by authenticated users"
    ON public.channels FOR SELECT TO authenticated USING (true);

-- Channel Access: viewable by the user or by devs
CREATE POLICY "Users can see own access"
    ON public.channel_access FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Devs can see all access"
    ON public.channel_access FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev')
    );

CREATE POLICY "Devs can grant access"
    ON public.channel_access FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev')
    );

CREATE POLICY "Devs can revoke access"
    ON public.channel_access FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev')
    );

-- Messages: complex policies based on channel_mode
-- Everyone can read messages in channels they have access to
CREATE POLICY "Read messages in accessible channels"
    ON public.messages FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.channels c
            WHERE c.id = messages.channel_id
            AND (
                -- Non-private channels: verified users or verify channel itself
                (c.channel_mode != 'private' AND (
                    c.requires_verification = false
                    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true)
                ))
                -- Private channels: must have explicit access
                OR (c.channel_mode = 'private' AND EXISTS (
                    SELECT 1 FROM public.channel_access ca
                    WHERE ca.channel_id = c.id AND ca.user_id = auth.uid()
                ))
                -- Devs can always read
                OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev')
            )
        )
    );

-- Insert messages based on channel_mode
CREATE POLICY "Send messages based on channel mode"
    ON public.messages FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.channels c
            WHERE c.id = messages.channel_id
            AND (
                -- Public chat: verified users can write
                (c.channel_mode = 'public_chat' AND EXISTS (
                    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true
                ))
                -- Admin write: only dev/admin/mod can write
                OR (c.channel_mode = 'admin_write' AND EXISTS (
                    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('dev', 'admin', 'mod')
                ))
                -- Private: must have access
                OR (c.channel_mode = 'private' AND EXISTS (
                    SELECT 1 FROM public.channel_access ca
                    WHERE ca.channel_id = c.id AND ca.user_id = auth.uid()
                ))
                -- Dev can always write anywhere
                OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev')
            )
        )
    );

CREATE POLICY "Authors can update own messages"
    ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete own messages"
    ON public.messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reactions
CREATE POLICY "Read reactions"
    ON public.reactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Add reactions to accessible messages"
    ON public.reactions FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.channels c ON c.id = m.channel_id
            WHERE m.id = reactions.message_id
            AND c.channel_mode IN ('admin_write', 'public_chat', 'private')
            AND (
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true)
                OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev')
            )
        )
    );

CREATE POLICY "Remove own reactions"
    ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- Enable Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;

-- ============================================
-- Seed: WORMHOLE channels
-- ============================================
INSERT INTO public.channels (name, slug, category, icon, channel_mode, position, requires_verification, topic) VALUES
    -- WORMHOLE category
    ('verify',   'verify',   'WORMHOLE', '🦅', 'verification', 0, false,
     'Verify to enter the Wormhole'),
    ('start',    'start',    'WORMHOLE', '⬇',  'readonly',     1, true, NULL),
    ('info',     'info',     'WORMHOLE', '👜', 'readonly',     2, true, NULL),
    ('energy',   'energy',   'WORMHOLE', '⚡', 'readonly',     3, true, NULL),
    ('gameplay', 'gameplay', 'WORMHOLE', '👾', 'admin_write',  4, true, NULL),
    ('intake',   'intake',   'WORMHOLE', '👥', 'disabled',     5, true, 'WORK IN PROGRESS'),
    -- survivor rooms category
    ('trench',   'trench',   'survivor rooms', '🌲', 'public_chat', 10, true, NULL),
    ('rooom',    'rooom',    'survivor rooms', '🍑', 'public_chat', 11, true, NULL),
    ('12',       '12',       'survivor rooms', '➖', 'private',     12, true, NULL);

-- ============================================
-- Function: Verify user
-- ============================================
CREATE OR REPLACE FUNCTION public.verify_user(user_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles SET is_verified = true WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
