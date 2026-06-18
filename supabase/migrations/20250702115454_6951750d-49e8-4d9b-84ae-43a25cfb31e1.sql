-- Improve the message status update function
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

-- Improve the mark_conversation_messages_read function for better real-time updates
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
  
  -- Log the operation for debugging
  RAISE LOG 'Marked % messages as read for conversation % by user %', updated_count, conv_id, reader_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the database has the correct realtime setup
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_attachments REPLICA IDENTITY FULL;

-- Add tables to realtime publication if not already added
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
END $$;