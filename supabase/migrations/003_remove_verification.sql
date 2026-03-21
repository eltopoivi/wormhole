-- ============================================
-- Remove verification requirement from all RLS policies
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop old message policies
DROP POLICY IF EXISTS "Read messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Send messages based on channel mode" ON public.messages;
DROP POLICY IF EXISTS "Add reactions to accessible messages" ON public.reactions;

-- New: any authenticated user can read messages (except private channels need access)
CREATE POLICY "Read messages in accessible channels"
    ON public.messages FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.channels c
            WHERE c.id = messages.channel_id
            AND (
                c.channel_mode != 'private'
                OR (c.channel_mode = 'private' AND EXISTS (
                    SELECT 1 FROM public.channel_access ca
                    WHERE ca.channel_id = c.id AND ca.user_id = auth.uid()
                ))
                OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev')
            )
        )
    );

-- New: any authenticated user can send messages based on channel mode (no verification check)
CREATE POLICY "Send messages based on channel mode"
    ON public.messages FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.channels c
            WHERE c.id = messages.channel_id
            AND (
                c.channel_mode = 'public_chat'
                OR (c.channel_mode = 'admin_write' AND EXISTS (
                    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('dev', 'admin', 'mod')
                ))
                OR (c.channel_mode = 'private' AND EXISTS (
                    SELECT 1 FROM public.channel_access ca
                    WHERE ca.channel_id = c.id AND ca.user_id = auth.uid()
                ))
                OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev')
            )
        )
    );

-- New: any authenticated user can react (except readonly/disabled channels)
CREATE POLICY "Add reactions to accessible messages"
    ON public.reactions FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.channels c ON c.id = m.channel_id
            WHERE m.id = reactions.message_id
            AND c.channel_mode IN ('admin_write', 'public_chat', 'private')
        )
    );
