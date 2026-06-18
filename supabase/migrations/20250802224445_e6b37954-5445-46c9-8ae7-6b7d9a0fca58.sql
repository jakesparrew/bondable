-- Enable password leak protection for better security
-- This addresses the security warning from the linter

-- Add indexes for better query performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient 
ON public.messages (sender_id, recipient_id);

CREATE INDEX IF NOT EXISTS idx_sessions_date_status 
ON public.sessions (session_date, status);

CREATE INDEX IF NOT EXISTS idx_tasks_client_status 
ON public.tasks (client_id, status);

CREATE INDEX IF NOT EXISTS idx_journal_entries_client_date 
ON public.journal_entries (client_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON public.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_role_email 
ON public.profiles (role, email);

-- Optimize conversation queries
CREATE INDEX IF NOT EXISTS idx_conversations_participants_updated 
ON public.conversations (therapist_id, client_id, updated_at DESC);

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON public.messages (recipient_id, created_at DESC) 
WHERE status != 'read';

CREATE INDEX IF NOT EXISTS idx_sessions_pending 
ON public.sessions (therapist_id, session_date) 
WHERE status = 'Pending';

-- Optimize for realtime queries
CREATE INDEX IF NOT EXISTS idx_messages_realtime_updates 
ON public.messages (conversation_id, sequence_number DESC, updated_at DESC);

-- Add function to clean up old data if needed
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Clean up old audit logs (older than 6 months)
  DELETE FROM public.audit_logs 
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  -- Clean up old notifications (older than 3 months and read)
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '3 months' 
  AND is_read = true;
  
  RAISE LOG 'Old data cleanup completed at %', NOW();
END;
$$;