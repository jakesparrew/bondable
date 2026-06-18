-- RLS policies for all tables + stub implementations of every RPC referenced in types.ts.
-- Stubs return sensible empty values so the UI doesn't crash; replace with full logic later.

-- ============================================================================
-- Helper: is current user an admin?
-- SECURITY DEFINER avoids RLS recursion when checking admin status from policies.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users a
        JOIN auth.users u ON u.email = a.user_email
        WHERE u.id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'::public.user_role
    );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- ============================================================================
-- profiles
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "profiles_select_self" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_related" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.client_therapist_relationships r
            WHERE (r.client_id = auth.uid() AND r.therapist_id = profiles.id)
               OR (r.therapist_id = auth.uid() AND r.client_id = profiles.id)
        )
    );
CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT USING (public.is_admin_user());
CREATE POLICY "profiles_update_self" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- client_therapist_relationships
-- ============================================================================
CREATE POLICY "ctr_select_participant" ON public.client_therapist_relationships
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "ctr_insert_participant" ON public.client_therapist_relationships
    FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "ctr_update_participant" ON public.client_therapist_relationships
    FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "ctr_delete_participant" ON public.client_therapist_relationships
    FOR DELETE USING (auth.uid() = client_id OR auth.uid() = therapist_id);

-- ============================================================================
-- conversations
-- ============================================================================
CREATE POLICY "conv_select_participant" ON public.conversations
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "conv_insert_participant" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "conv_update_participant" ON public.conversations
    FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = therapist_id);

-- ============================================================================
-- messages
-- ============================================================================
CREATE POLICY "msg_select_participant" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "msg_insert_sender" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "msg_update_participant" ON public.messages
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ============================================================================
-- message_attachments
-- ============================================================================
CREATE POLICY "msg_att_select" ON public.message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_attachments.message_id
              AND (auth.uid() = m.sender_id OR auth.uid() = m.recipient_id)
        )
    );
CREATE POLICY "msg_att_insert" ON public.message_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_attachments.message_id
              AND auth.uid() = m.sender_id
        )
    );

-- ============================================================================
-- journal_entries
-- Client owns; therapists with the entry shared can read.
-- ============================================================================
CREATE POLICY "journal_select_client" ON public.journal_entries
    FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "journal_select_shared_therapist" ON public.journal_entries
    FOR SELECT USING (
        is_shared_with_therapist = true
        AND EXISTS (
            SELECT 1 FROM public.client_therapist_relationships r
            WHERE r.client_id = journal_entries.client_id
              AND r.therapist_id = auth.uid()
              AND r.status = 'active'
        )
    );
CREATE POLICY "journal_insert_client" ON public.journal_entries
    FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "journal_update_client" ON public.journal_entries
    FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "journal_delete_client" ON public.journal_entries
    FOR DELETE USING (auth.uid() = client_id);

-- ============================================================================
-- notifications
-- ============================================================================
CREATE POLICY "notif_select_self" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update_self" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_delete_self" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- sessions
-- ============================================================================
CREATE POLICY "sess_select_participant" ON public.sessions
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "sess_insert_participant" ON public.sessions
    FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "sess_update_participant" ON public.sessions
    FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "sess_delete_participant" ON public.sessions
    FOR DELETE USING (auth.uid() = client_id OR auth.uid() = therapist_id);

-- ============================================================================
-- tasks
-- ============================================================================
CREATE POLICY "tasks_select_participant" ON public.tasks
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "tasks_insert_therapist" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "tasks_update_participant" ON public.tasks
    FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY "tasks_delete_therapist" ON public.tasks
    FOR DELETE USING (auth.uid() = therapist_id);

-- ============================================================================
-- google_calendar_connections / local_documents / user_devices: own only
-- ============================================================================
CREATE POLICY "gcal_self" ON public.google_calendar_connections
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "local_docs_self" ON public.local_documents
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_devices_self" ON public.user_devices
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- clients (legacy table — therapist owns rows via therapist_id)
-- ============================================================================
CREATE POLICY "clients_select_therapist" ON public.clients
    FOR SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "clients_insert_therapist" ON public.clients
    FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "clients_update_therapist" ON public.clients
    FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY "clients_delete_therapist" ON public.clients
    FOR DELETE USING (auth.uid() = therapist_id);

-- ============================================================================
-- Admin-only tables: admin_users, admin_notification_settings, ai_settings, audit_logs
-- ============================================================================
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_admin_only" ON public.admin_users
    FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "admin_notif_admin_only" ON public.admin_notification_settings
    FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "ai_settings_admin_only" ON public.ai_settings
    FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
    FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- external_messages tied to conversation participants
CREATE POLICY "ext_msg_select" ON public.external_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = external_messages.conversation_id
              AND (auth.uid() = c.client_id OR auth.uid() = c.therapist_id)
        )
    );

-- messaging_sessions: own session or service role only
CREATE POLICY "msging_sess_self" ON public.messaging_sessions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RPC FUNCTIONS (stubs from types.ts — return sensible empty values)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_id UUID DEFAULT NULL,
    p_related_type TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
    VALUES (p_user_id, p_type, p_title, p_message, p_related_id, p_related_type);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE sql
AS $$
    SELECT upper(substring(encode(gen_random_bytes(6), 'base64') FROM 1 FOR 8));
$$;

CREATE OR REPLACE FUNCTION public.get_unread_message_counts(p_user_id UUID)
RETURNS TABLE (conversation_id UUID, unread_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT m.conversation_id, COUNT(*)::bigint
    FROM public.messages m
    WHERE m.recipient_id = p_user_id AND m.read_at IS NULL
    GROUP BY m.conversation_id;
$$;

CREATE OR REPLACE FUNCTION public.get_conversation_messages_optimized(
    p_conversation_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    sender_id UUID,
    message_type TEXT,
    created_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT m.id, m.content, m.sender_id, m.message_type, m.created_at, m.read_at, m.status
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
    ORDER BY m.created_at DESC
    LIMIT p_limit OFFSET p_offset;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized(
    p_user_id UUID,
    p_user_type TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    IF p_user_type = 'therapist' THEN
        SELECT jsonb_build_object(
            'total_clients', (SELECT COUNT(*) FROM public.client_therapist_relationships WHERE therapist_id = p_user_id AND status = 'active'),
            'upcoming_sessions', (SELECT COUNT(*) FROM public.sessions WHERE therapist_id = p_user_id AND session_date >= CURRENT_DATE),
            'pending_tasks', (SELECT COUNT(*) FROM public.tasks WHERE therapist_id = p_user_id AND status = 'pending'),
            'unread_messages', (SELECT COUNT(*) FROM public.messages WHERE recipient_id = p_user_id AND read_at IS NULL)
        ) INTO result;
    ELSE
        SELECT jsonb_build_object(
            'upcoming_sessions', (SELECT COUNT(*) FROM public.sessions WHERE client_id = p_user_id AND session_date >= CURRENT_DATE),
            'pending_tasks', (SELECT COUNT(*) FROM public.tasks WHERE client_id = p_user_id AND status = 'pending'),
            'completed_tasks', (SELECT COUNT(*) FROM public.tasks WHERE client_id = p_user_id AND status = 'completed'),
            'unread_messages', (SELECT COUNT(*) FROM public.messages WHERE recipient_id = p_user_id AND read_at IS NULL)
        ) INTO result;
    END IF;
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(conv_id UUID, reader_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.messages
    SET read_at = now(), status = 'read', updated_at = now()
    WHERE conversation_id = conv_id AND recipient_id = reader_id AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.mark_messages_as_read_enhanced(conv_id UUID, reader_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.messages
    SET read_at = now(), status = 'read', updated_at = now()
    WHERE conversation_id = conv_id AND recipient_id = reader_id AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.mark_messages_as_read_new(conv_id UUID, reader_id UUID)
RETURNS TABLE (updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cnt INTEGER;
BEGIN
    WITH upd AS (
        UPDATE public.messages
        SET read_at = now(), status = 'read', updated_at = now()
        WHERE conversation_id = conv_id AND recipient_id = reader_id AND read_at IS NULL
        RETURNING 1
    )
    SELECT COUNT(*) INTO cnt FROM upd;
    RETURN QUERY SELECT cnt;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(conv_id UUID, reader_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.messages
    SET read_at = now(), status = 'read', updated_at = now()
    WHERE conversation_id = conv_id AND recipient_id = reader_id AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.mark_message_delivered(msg_id UUID, recipient_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.messages
    SET status = 'delivered', updated_at = now()
    WHERE id = msg_id AND recipient_id = recipient_user_id AND status = 'sent';
$$;

CREATE OR REPLACE FUNCTION public.update_message_status(msg_id UUID, new_status TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.messages SET status = new_status, updated_at = now() WHERE id = msg_id;
$$;

CREATE OR REPLACE FUNCTION public.update_typing_status(
    conversation_id UUID,
    user_id UUID,
    is_typing BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- No-op stub: real-time typing indicators are handled via Supabase Realtime channels.
    -- Kept here so client RPC calls succeed.
    NULL;
END;
$$;

-- Admin management RPCs
CREATE OR REPLACE FUNCTION public.create_admin_user(user_email TEXT)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    INSERT INTO public.admin_users (user_email, granted_by)
    VALUES (user_email, auth.uid())
    ON CONFLICT (user_email) DO NOTHING;
    RETURN user_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_admin_access(user_email TEXT)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    INSERT INTO public.admin_users (user_email, granted_by)
    VALUES (user_email, auth.uid())
    ON CONFLICT (user_email) DO NOTHING;
    UPDATE public.profiles p
    SET role = 'admin'::public.user_role
    FROM auth.users u
    WHERE p.id = u.id AND u.email = user_email;
    RETURN user_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_admin_user(user_email TEXT)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    DELETE FROM public.admin_users WHERE user_email = remove_admin_user.user_email;
    RETURN user_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_admin_access(user_email TEXT)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    DELETE FROM public.admin_users WHERE user_email = revoke_admin_access.user_email;
    UPDATE public.profiles p
    SET role = 'client'::public.user_role
    FROM auth.users u
    WHERE p.id = u.id AND u.email = user_email;
    RETURN user_email;
END;
$$;

-- Cleanup utilities (no-op stubs — wire up actual retention policy later)
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.notifications WHERE created_at < now() - INTERVAL '90 days' AND is_read = true;
    DELETE FROM public.audit_logs WHERE created_at < now() - INTERVAL '180 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_connections()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.user_devices
    SET is_active = false
    WHERE is_active = true AND (last_seen_at IS NULL OR last_seen_at < now() - INTERVAL '30 days');
END;
$$;

-- Useful indexes for the policies and RPCs above
CREATE INDEX IF NOT EXISTS idx_messages_conversation_recipient_unread
    ON public.messages(conversation_id, recipient_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ctr_client ON public.client_therapist_relationships(client_id);
CREATE INDEX IF NOT EXISTS idx_ctr_therapist ON public.client_therapist_relationships(therapist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON public.sessions(client_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_date ON public.sessions(therapist_id, session_date);
CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON public.tasks(client_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_therapist_status ON public.tasks(therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;
