-- PHASE 4: DATABASE PERFORMANCE OPTIMIZATION (CORRECTED)
-- Creating comprehensive performance indexes for optimal query speed

-- ===== MESSAGES TABLE OPTIMIZATION =====

-- Primary index for realtime message queries (conversation + timestamp)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_realtime 
ON messages (conversation_id, created_at DESC);

-- Index for unread message queries (recipient + read status)  
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread
ON messages (recipient_id, read_at)
WHERE read_at IS NULL;

-- Index for message search queries (sender lookup)
CREATE INDEX IF NOT EXISTS idx_messages_sender_lookup
ON messages (sender_id, created_at DESC);

-- Index for message status tracking
CREATE INDEX IF NOT EXISTS idx_messages_status
ON messages (status, updated_at DESC);

-- ===== CONVERSATIONS TABLE OPTIMIZATION =====

-- Index for user conversation listings with last message
CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message
ON conversations (client_id, therapist_id, last_message_at DESC);

-- Index for conversation participants lookup
CREATE INDEX IF NOT EXISTS idx_conversations_participants
ON conversations (client_id, therapist_id);

-- Index for unread count queries
CREATE INDEX IF NOT EXISTS idx_conversations_unread
ON conversations (client_id, therapist_id, unread_count_client, unread_count_therapist);

-- ===== TASKS TABLE OPTIMIZATION =====

-- Index for user task queries with status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_user_status
ON tasks (client_id, therapist_id, status, created_at DESC);

-- Index for due date queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
ON tasks (due_date, status)
WHERE due_date IS NOT NULL;

-- Index for task priority queries
CREATE INDEX IF NOT EXISTS idx_tasks_priority
ON tasks (priority, status, created_at DESC);

-- ===== SESSIONS TABLE OPTIMIZATION =====

-- Index for active session queries
CREATE INDEX IF NOT EXISTS idx_sessions_active
ON sessions (client_id, therapist_id, status, session_date DESC)
WHERE status IN ('Pending', 'Confirmed');

-- Index for session scheduling queries
CREATE INDEX IF NOT EXISTS idx_sessions_scheduling
ON sessions (therapist_id, session_date, session_time)
WHERE status = 'Confirmed';

-- Index for session history queries
CREATE INDEX IF NOT EXISTS idx_sessions_history
ON sessions (client_id, therapist_id, session_date DESC)
WHERE status = 'Completed';

-- ===== JOURNAL ENTRIES TABLE OPTIMIZATION =====

-- Index for user journal entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user
ON journal_entries (client_id, created_at DESC);

-- Index for shared journal entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_shared
ON journal_entries (client_id, is_shared_with_therapist, created_at DESC)
WHERE is_shared_with_therapist = true;

-- Index for entry date queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_date
ON journal_entries (client_id, entry_date DESC);

-- ===== NOTIFICATIONS TABLE OPTIMIZATION =====

-- Index for user notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications (user_id, is_read, created_at DESC)
WHERE is_read = false;

-- Index for notification type queries
CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications (type, created_at DESC);

-- ===== CLIENT-THERAPIST RELATIONSHIPS OPTIMIZATION =====

-- Index for relationship lookups
CREATE INDEX IF NOT EXISTS idx_client_therapist_relationships_lookup
ON client_therapist_relationships (client_id, therapist_id, status);

-- Index for active relationships
CREATE INDEX IF NOT EXISTS idx_client_therapist_relationships_active
ON client_therapist_relationships (therapist_id, status, connected_at DESC)
WHERE status = 'active';

-- ===== PROFILES TABLE OPTIMIZATION =====

-- Index for user profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_lookup
ON profiles (id, first_name, last_name, email);

-- Index for therapist search
CREATE INDEX IF NOT EXISTS idx_profiles_therapist_search
ON profiles (role, first_name, last_name)
WHERE role = 'therapist';

-- Index for invite code lookup
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code
ON profiles (invite_code)
WHERE invite_code IS NOT NULL;

-- ===== MESSAGE ATTACHMENTS OPTIMIZATION =====

-- Index for message attachment lookups
CREATE INDEX IF NOT EXISTS idx_message_attachments_message
ON message_attachments (message_id, file_type);

-- Index for file type queries
CREATE INDEX IF NOT EXISTS idx_message_attachments_type
ON message_attachments (file_type, created_at DESC);

-- ===== CLIENTS TABLE OPTIMIZATION =====

-- Index for therapist client lookup
CREATE INDEX IF NOT EXISTS idx_clients_therapist
ON clients (therapist_id, status, created_at DESC);

-- Index for client status queries
CREATE INDEX IF NOT EXISTS idx_clients_status
ON clients (status, created_at DESC);

-- ===== PERFORMANCE MONITORING =====

-- Update table statistics for better query planning
ANALYZE messages;
ANALYZE conversations;
ANALYZE tasks;
ANALYZE sessions;
ANALYZE journal_entries;
ANALYZE notifications;
ANALYZE client_therapist_relationships;
ANALYZE profiles;
ANALYZE message_attachments;
ANALYZE clients;

-- ===== QUERY OPTIMIZATION FUNCTIONS =====

-- Optimized function to get conversation messages with pagination
CREATE OR REPLACE FUNCTION get_conversation_messages_optimized(
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, m.sender_id, m.message_type, 
         m.created_at, m.read_at, m.status
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Optimized function to get user dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats_optimized(
  p_user_id UUID,
  p_user_type TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF p_user_type = 'therapist' THEN
    SELECT json_build_object(
      'total_clients', (SELECT COUNT(*) FROM client_therapist_relationships WHERE therapist_id = p_user_id AND status = 'active'),
      'pending_tasks', (SELECT COUNT(*) FROM tasks WHERE therapist_id = p_user_id AND status = 'assigned'),
      'unread_messages', (SELECT COUNT(*) FROM messages WHERE recipient_id = p_user_id AND read_at IS NULL),
      'upcoming_sessions', (SELECT COUNT(*) FROM sessions WHERE therapist_id = p_user_id AND status = 'Confirmed' AND session_date >= CURRENT_DATE)
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'pending_tasks', (SELECT COUNT(*) FROM tasks WHERE client_id = p_user_id AND status = 'assigned'),
      'unread_messages', (SELECT COUNT(*) FROM messages WHERE recipient_id = p_user_id AND read_at IS NULL),
      'upcoming_sessions', (SELECT COUNT(*) FROM sessions WHERE client_id = p_user_id AND status = 'Confirmed' AND session_date >= CURRENT_DATE),
      'journal_entries', (SELECT COUNT(*) FROM journal_entries WHERE client_id = p_user_id)
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Optimized function for unread message counts
CREATE OR REPLACE FUNCTION get_unread_message_counts(
  p_user_id UUID
)
RETURNS TABLE (
  conversation_id UUID,
  unread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, 
         CASE 
           WHEN c.client_id = p_user_id THEN c.unread_count_client
           WHEN c.therapist_id = p_user_id THEN c.unread_count_therapist
           ELSE 0
         END as unread_count
  FROM conversations c
  WHERE (c.client_id = p_user_id OR c.therapist_id = p_user_id)
    AND ((c.client_id = p_user_id AND c.unread_count_client > 0) 
         OR (c.therapist_id = p_user_id AND c.unread_count_therapist > 0));
END;
$$ LANGUAGE plpgsql STABLE;