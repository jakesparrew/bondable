-- Create database performance optimization indexes

-- Optimize messages table for realtime queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_status 
ON public.messages (conversation_id, status) 
WHERE status IN ('sent', 'delivered');

-- Optimize for read receipt queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recipient_unread 
ON public.messages (recipient_id, status, created_at DESC) 
WHERE status != 'read';

-- Optimize conversations for last message queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_last_message 
ON public.conversations (therapist_id, last_message_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_client_last_message 
ON public.conversations (client_id, last_message_at DESC);

-- Optimize for realtime subscription queries on messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_realtime_updates 
ON public.messages (conversation_id, updated_at DESC) 
WHERE status != 'read';

-- Add partial index for active sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_active 
ON public.sessions (therapist_id, session_date) 
WHERE status IN ('Pending', 'Confirmed');

-- Optimize journal entries for therapist queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entries_sharing 
ON public.journal_entries (sharing_type, entry_date DESC) 
WHERE sharing_type != 'private';

-- Add index for notification queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, is_read, created_at DESC) 
WHERE is_read = false;

-- Optimize client-therapist relationship queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_therapist_active 
ON public.client_therapist_relationships (status, therapist_id, client_id) 
WHERE status = 'active';

-- Add database configuration optimizations
-- These settings help reduce the frequency of realtime.list_changes calls
COMMENT ON INDEX idx_messages_conversation_status IS 'Optimizes realtime message queries by conversation and status';
COMMENT ON INDEX idx_messages_recipient_unread IS 'Reduces scan time for unread message queries';
COMMENT ON INDEX idx_conversations_user_last_message IS 'Speeds up conversation listing for therapists';
COMMENT ON INDEX idx_conversations_client_last_message IS 'Speeds up conversation listing for clients';
COMMENT ON INDEX idx_messages_realtime_updates IS 'Optimizes realtime subscription performance';

-- Create a function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_realtime_performance()
RETURNS TABLE(
    table_name TEXT,
    index_usage TEXT,
    estimated_rows BIGINT,
    recommendation TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'messages'::TEXT as table_name,
        CASE 
            WHEN pg_stat_user_indexes.idx_scan > 0 THEN 'Good - indexes being used'
            ELSE 'Poor - consider query optimization'
        END as index_usage,
        pg_class.reltuples::BIGINT as estimated_rows,
        CASE 
            WHEN pg_class.reltuples > 10000 AND pg_stat_user_indexes.idx_scan = 0 
            THEN 'Consider adding more specific indexes'
            WHEN pg_class.reltuples > 50000 
            THEN 'Consider message archiving or partitioning'
            ELSE 'Performance looks good'
        END as recommendation
    FROM pg_class
    LEFT JOIN pg_stat_user_tables ON pg_class.oid = pg_stat_user_tables.relid
    LEFT JOIN pg_stat_user_indexes ON pg_class.oid = pg_stat_user_indexes.relid
    WHERE pg_class.relname = 'messages'
    LIMIT 1;
END;
$$;