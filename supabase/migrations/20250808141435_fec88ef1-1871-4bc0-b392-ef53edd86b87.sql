-- Additional high-value indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments (message_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_clients_therapist_id ON public.clients (therapist_id);
CREATE INDEX IF NOT EXISTS idx_ctr_therapist_status ON public.client_therapist_relationships (therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_ctr_client_status ON public.client_therapist_relationships (client_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_date ON public.sessions (therapist_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON public.sessions (client_id, session_date);

-- Improve realtime payloads
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;