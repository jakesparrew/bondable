-- Create RPC to return unread message counts per conversation for a user
-- Safe against missing tables/columns; returns empty set if prerequisites aren't present

CREATE OR REPLACE FUNCTION public.get_unread_message_counts(p_user_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  unread_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- If messages table doesn't exist, return empty set
  IF to_regclass('public.messages') IS NULL THEN
    RETURN;
  END IF;

  -- If conversation_id column doesn't exist, return empty set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    RETURN;
  END IF;

  -- Determine unread condition based on available schema
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'is_read'
  ) THEN
    RETURN QUERY
    SELECT m.conversation_id, COUNT(*)::int AS unread_count
    FROM public.messages m
    WHERE m.recipient_id = p_user_id
      AND COALESCE(m.is_read, false) = false
    GROUP BY m.conversation_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'read_at'
  ) THEN
    RETURN QUERY
    SELECT m.conversation_id, COUNT(*)::int AS unread_count
    FROM public.messages m
    WHERE m.recipient_id = p_user_id
      AND m.read_at IS NULL
    GROUP BY m.conversation_id;
  ELSE
    -- No recognized unread marker columns; return empty set
    RETURN;
  END IF;
END;
$$;

-- Ensure execute privileges for clients
GRANT EXECUTE ON FUNCTION public.get_unread_message_counts(uuid) TO anon, authenticated;