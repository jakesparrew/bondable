-- Bootstrap schema reconstructed from src/integrations/supabase/types.ts
-- Creates the final state of all tables and the user_role enum.
-- RLS policies, triggers, and SECURITY DEFINER functions are added later as needed.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('therapist', 'client', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    address TEXT,
    age TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    date_of_birth DATE,
    email TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    first_name TEXT,
    invite_code TEXT,
    last_name TEXT,
    phone TEXT,
    role public.user_role NOT NULL DEFAULT 'client',
    updated_at TIMESTAMPTZ DEFAULT now(),
    weekly_availability JSONB
);

CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    email_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    notification_type TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by UUID,
    user_email TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    setting_name TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    new_values JSONB,
    old_values JSONB,
    record_id UUID,
    table_name TEXT,
    user_id UUID
);

CREATE TABLE IF NOT EXISTS public.client_therapist_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(client_id, therapist_id)
);

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    email TEXT NOT NULL,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    first_name TEXT NOT NULL,
    join_date DATE,
    last_name TEXT NOT NULL,
    last_session DATE,
    next_session DATE,
    notes TEXT,
    phone TEXT,
    status TEXT,
    therapist_id UUID NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    unread_count_client INTEGER DEFAULT 0,
    unread_count_therapist INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(client_id, therapist_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    sequence_number BIGSERIAL,
    status TEXT NOT NULL DEFAULT 'sent',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    duration_seconds NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    content TEXT NOT NULL,
    direction TEXT NOT NULL,
    from_number TEXT,
    to_number TEXT,
    provider_sid TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    error JSONB,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    connected BOOLEAN NOT NULL DEFAULT false,
    refresh_token TEXT,
    scope TEXT,
    last_synced_at TIMESTAMPTZ,
    last_synced_start TIMESTAMPTZ,
    last_synced_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    mood TEXT,
    entry_date DATE,
    is_shared_with_therapist BOOLEAN DEFAULT false,
    shared_with_therapists JSONB DEFAULT '[]'::jsonb,
    sharing_type TEXT,
    attachments JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messaging_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    actor_role TEXT NOT NULL,
    channel TEXT NOT NULL,
    phone_digits TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'idle',
    selected_id TEXT,
    options JSONB,
    expire_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    related_type TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    session_type TEXT NOT NULL,
    session_format TEXT,
    therapy_type TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    waiting_for_response_from UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    priority TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date TIMESTAMPTZ,
    denied_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    platform TEXT NOT NULL,
    push_provider TEXT NOT NULL DEFAULT 'fcm',
    device_info JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(token)
);

-- Auto-create profile when a new auth user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'client'::public.user_role)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper: current user's role (used by RLS policies later)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Enable RLS on all user-facing tables (policies added incrementally)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_therapist_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Minimal policies so an authenticated user can use the app
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
