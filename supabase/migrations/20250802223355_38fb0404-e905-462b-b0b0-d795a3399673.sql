-- Create database performance optimization indexes (without CONCURRENTLY for transaction compatibility)

-- Optimize messages table for realtime queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_status 
ON public.messages (conversation_id, status) 
WHERE status IN ('sent', 'delivered');

-- Optimize for read receipt queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread 
ON public.messages (recipient_id, status, created_at DESC) 
WHERE status != 'read';

-- Optimize conversations for last message queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message 
ON public.conversations (therapist_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_client_last_message 
ON public.conversations (client_id, last_message_at DESC);

-- Optimize for realtime subscription queries on messages
CREATE INDEX IF NOT EXISTS idx_messages_realtime_updates 
ON public.messages (conversation_id, updated_at DESC) 
WHERE status != 'read';

-- Add partial index for active sessions
CREATE INDEX IF NOT EXISTS idx_sessions_active 
ON public.sessions (therapist_id, session_date) 
WHERE status IN ('Pending', 'Confirmed');

-- Optimize journal entries for therapist queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_sharing 
ON public.journal_entries (sharing_type, entry_date DESC) 
WHERE sharing_type != 'private';

-- Add index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, is_read, created_at DESC) 
WHERE is_read = false;

-- Optimize client-therapist relationship queries
CREATE INDEX IF NOT EXISTS idx_client_therapist_active 
ON public.client_therapist_relationships (status, therapist_id, client_id) 
WHERE status = 'active';