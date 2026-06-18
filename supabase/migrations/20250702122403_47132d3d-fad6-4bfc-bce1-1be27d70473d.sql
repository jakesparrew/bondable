-- Enhanced realtime messaging stability improvements
-- Fix subscription timeout issues and improve connection stability

-- Improve the message status update function to be more reliable
CREATE OR REPLACE FUNCTION public.update_message_status_instantly()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status to 'sent' immediately
  NEW.status = 'sent';
  NEW.updated_at = now();
  
  -- Update conversation's last message info
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to mark messages as read with better performance
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(conv_id uuid, reader_id uuid)
RETURNS void AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update messages to read status and get count
  UPDATE public.messages 
  SET 
    status = 'read',
    read_at = now(),
    updated_at = now()
  WHERE conversation_id = conv_id 
    AND recipient_id = reader_id 
    AND status != 'read';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Only log if messages were actually updated
  IF updated_count > 0 THEN
    RAISE LOG 'Marked % messages as read for conversation % by user %', updated_count, conv_id, reader_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper replica identity for all realtime tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_attachments REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Ensure realtime publication includes all necessary tables
DO $$
BEGIN
  -- Add messages table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN
      -- Table already in publication, ignore
      NULL;
  END;
  
  -- Add message_attachments table to realtime publication  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
    EXCEPTION WHEN duplicate_object THEN
      -- Table already in publication, ignore
      NULL;
  END;
  
  -- Add conversations table to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    EXCEPTION WHEN duplicate_object THEN
      -- Table already in publication, ignore
      NULL;
  END;
END $$;

-- Add indexes for better performance (non-concurrent for migration)
DROP INDEX IF EXISTS idx_messages_conversation_created;
CREATE INDEX idx_messages_conversation_created 
ON public.messages (conversation_id, created_at DESC);

DROP INDEX IF EXISTS idx_messages_recipient_status;
CREATE INDEX idx_messages_recipient_status 
ON public.messages (recipient_id, status) 
WHERE status != 'read';

DROP INDEX IF EXISTS idx_messages_updated_at;
CREATE INDEX idx_messages_updated_at 
ON public.messages (updated_at DESC);

DROP INDEX IF EXISTS idx_conversations_participants;
CREATE INDEX idx_conversations_participants 
ON public.conversations (therapist_id, client_id);

DROP INDEX IF EXISTS idx_conversations_last_message;
CREATE INDEX idx_conversations_last_message 
ON public.conversations (last_message_at DESC);

-- Add function to cleanup stale realtime connections (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_stale_connections()
RETURNS void AS $$
BEGIN
  -- This function can be called by a scheduled job to cleanup
  -- any stale realtime connections or perform maintenance
  
  -- Log cleanup activity
  RAISE LOG 'Realtime connection cleanup performed at %', now();
  
  -- In the future, we could add logic here to:
  -- - Detect and clean up abandoned realtime channels
  -- - Reset stuck message statuses
  -- - Perform other maintenance tasks
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;