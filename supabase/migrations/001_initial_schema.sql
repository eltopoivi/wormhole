-- ============================================
-- Wormhole (Discord Clone) — Phase 1 Schema
-- ============================================

-- Custom enum types
CREATE TYPE user_status AS ENUM ('online', 'idle', 'dnd', 'offline');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE channel_type AS ENUM ('text', 'voice');

-- ============================================
-- 1. Profiles (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username   TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    status     user_status NOT NULL DEFAULT 'offline',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
-- 2. Servers
-- ============================================
CREATE TABLE public.servers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    icon_url    TEXT,
    owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. Server Members (junction table)
-- ============================================
CREATE TABLE public.server_members (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role      member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (server_id, user_id)
);

-- ============================================
-- 4. Channels
-- ============================================
CREATE TABLE public.channels (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id  UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    topic      TEXT,
    type       channel_type NOT NULL DEFAULT 'text',
    position   INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 5. Messages
-- ============================================
CREATE TABLE public.messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    edited_at  TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast message retrieval by channel
CREATE INDEX idx_messages_channel_created ON public.messages (channel_id, created_at DESC);

-- Index for server members lookup
CREATE INDEX idx_server_members_server ON public.server_members (server_id);
CREATE INDEX idx_server_members_user ON public.server_members (user_id);

-- Index for channels by server
CREATE INDEX idx_channels_server ON public.channels (server_id, position);

-- ============================================
-- 6. Row Level Security (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone authenticated can read, only owner can update
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Servers: members can read, owner can manage
CREATE POLICY "Server members can view servers"
    ON public.servers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.server_members
            WHERE server_members.server_id = servers.id
            AND server_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create servers"
    ON public.servers FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Server owner can update server"
    ON public.servers FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "Server owner can delete server"
    ON public.servers FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- Server Members: members can view co-members, authenticated can join
CREATE POLICY "Members can view server members"
    ON public.server_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.server_members AS sm
            WHERE sm.server_id = server_members.server_id
            AND sm.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can join servers"
    ON public.server_members FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave servers"
    ON public.server_members FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Channels: server members can read, owner/admin can manage
CREATE POLICY "Server members can view channels"
    ON public.channels FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.server_members
            WHERE server_members.server_id = channels.server_id
            AND server_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Server owner can manage channels"
    ON public.channels FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.servers
            WHERE servers.id = channels.server_id
            AND servers.owner_id = auth.uid()
        )
    );

-- Messages: server members can read, author can create/edit
CREATE POLICY "Server members can view messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.channels
            JOIN public.server_members ON server_members.server_id = channels.server_id
            WHERE channels.id = messages.channel_id
            AND server_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Server members can send messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.channels
            JOIN public.server_members ON server_members.server_id = channels.server_id
            WHERE channels.id = messages.channel_id
            AND server_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Authors can update own messages"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete own messages"
    ON public.messages FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- 7. Enable Realtime for messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- 8. Helper: Auto-create #general channel + owner membership on server creation
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_server()
RETURNS TRIGGER AS $$
BEGIN
    -- Add owner as member
    INSERT INTO public.server_members (server_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');

    -- Create default #general channel
    INSERT INTO public.channels (server_id, name, position)
    VALUES (NEW.id, 'general', 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_server_created
    AFTER INSERT ON public.servers
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_server();
