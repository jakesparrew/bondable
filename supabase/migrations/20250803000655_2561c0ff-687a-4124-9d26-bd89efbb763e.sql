-- PHASE 4: DATABASE PERFORMANCE OPTIMIZATION
-- Creating comprehensive performance indexes for optimal query speed

-- ===== MESSAGES TABLE OPTIMIZATION =====

-- Primary index for realtime message queries (conversation + timestamp)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_realtime 
ON messages (conversation_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index for unread message queries (recipient + read status)  
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread
ON messages (recipient_id, read_at)
WHERE read_at IS NULL AND deleted_at IS NULL;

-- Index for message search queries (content search)
CREATE INDEX IF NOT EXISTS idx_messages_content_search
ON messages USING gin(to_tsvector('english', content))
WHERE message_type = 'text' AND deleted_at IS NULL;

-- Index for attachment queries
CREATE INDEX IF NOT EXISTS idx_messages_attachments
ON messages (id, message_type, attachment_url)
WHERE attachment_url IS NOT NULL AND deleted_at IS NULL;

-- ===== CONVERSATIONS TABLE OPTIMIZATION =====

-- Index for user conversation listings with last message
CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message
ON conversations (client_id, therapist_id, last_message_at DESC)
WHERE deleted_at IS NULL;

-- Index for conversation participants lookup
CREATE INDEX IF NOT EXISTS idx_conversations_participants
ON conversations (client_id, therapist_id)
WHERE deleted_at IS NULL;

-- ===== TASKS TABLE OPTIMIZATION =====

-- Index for user task queries with status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_user_status
ON tasks (client_id, therapist_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for due date queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
ON tasks (due_date, status)
WHERE due_date IS NOT NULL AND deleted_at IS NULL;

-- Index for task priority queries
CREATE INDEX IF NOT EXISTS idx_tasks_priority
ON tasks (priority, status, created_at DESC)
WHERE deleted_at IS NULL;

-- ===== SESSIONS TABLE OPTIMIZATION =====

-- Index for active session queries
CREATE INDEX IF NOT EXISTS idx_sessions_active
ON sessions (client_id, therapist_id, status, scheduled_for DESC)
WHERE status IN ('scheduled', 'in_progress');

-- Index for session scheduling queries
CREATE INDEX IF NOT EXISTS idx_sessions_scheduling
ON sessions (therapist_id, scheduled_for)
WHERE status = 'scheduled' AND scheduled_for >= NOW();

-- Index for session history queries
CREATE INDEX IF NOT EXISTS idx_sessions_history
ON sessions (client_id, therapist_id, scheduled_for DESC)
WHERE status = 'completed';

-- ===== JOURNAL ENTRIES TABLE OPTIMIZATION =====

-- Index for user journal entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user
ON journal_entries (client_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for shared journal entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_shared
ON journal_entries (client_id, shared_with_therapist, created_at DESC)
WHERE shared_with_therapist = true AND deleted_at IS NULL;

-- ===== NOTIFICATIONS TABLE OPTIMIZATION =====

-- Index for user notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications (user_id, read_at, created_at DESC)
WHERE read_at IS NULL;

-- Index for notification type queries
CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications (notification_type, created_at DESC);

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
ON profiles (user_type, first_name, last_name)
WHERE user_type = 'therapist';

-- ===== PERFORMANCE MONITORING =====

-- Create a function to monitor query performance
CREATE OR REPLACE FUNCTION log_slow_queries()
RETURNS event_trigger AS $$
BEGIN
  -- This would be implemented with actual monitoring logic
  -- For now, we'll create the structure
  NULL;
END;
$$ LANGUAGE plpgsql;

-- ===== STATISTICS UPDATE =====

-- Update table statistics for better query planning
ANALYZE messages;
ANALYZE conversations;
ANALYZE tasks;
ANALYZE sessions;
ANALYZE journal_entries;
ANALYZE notifications;
ANALYZE client_therapist_relationships;
ANALYZE profiles;

-- ===== CLEANUP OLD DATA =====

-- Create function to cleanup old read notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE read_at IS NOT NULL 
    AND read_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ===== QUERY OPTIMIZATION FUNCTIONS =====

-- Optimized function to get conversation messages with pagination
CREATE OR REPLACE FUNCTION get_conversation_messages(
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
  attachment_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, m.sender_id, m.message_type, 
         m.created_at, m.read_at, m.attachment_url
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.deleted_at IS NULL
  ORDER BY m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Optimized function to get user dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(
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
      'pending_tasks', (SELECT COUNT(*) FROM tasks WHERE therapist_id = p_user_id AND status = 'pending'),
      'unread_messages', (SELECT COUNT(*) FROM messages WHERE recipient_id = p_user_id AND read_at IS NULL),
      'upcoming_sessions', (SELECT COUNT(*) FROM sessions WHERE therapist_id = p_user_id AND status = 'scheduled' AND scheduled_for >= NOW())
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'pending_tasks', (SELECT COUNT(*) FROM tasks WHERE client_id = p_user_id AND status = 'pending'),
      'unread_messages', (SELECT COUNT(*) FROM messages WHERE recipient_id = p_user_id AND read_at IS NULL),
      'upcoming_sessions', (SELECT COUNT(*) FROM sessions WHERE client_id = p_user_id AND status = 'scheduled' AND scheduled_for >= NOW()),
      'journal_entries', (SELECT COUNT(*) FROM journal_entries WHERE client_id = p_user_id AND deleted_at IS NULL)
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;