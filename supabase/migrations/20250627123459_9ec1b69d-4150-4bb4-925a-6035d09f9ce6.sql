
-- Enable realtime for messages and conversations tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Create a trigger to instantly update message status to 'sent' after insert
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

-- Create trigger for instant message status updates
DROP TRIGGER IF EXISTS update_message_status_trigger ON public.messages;
CREATE TRIGGER update_message_status_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_message_status_instantly();

-- Create function to handle message read status
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(conv_id uuid, reader_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.messages 
  SET 
    status = 'read',
    read_at = now(),
    updated_at = now()
  WHERE conversation_id = conv_id 
    AND recipient_id = reader_id 
    AND status != 'read';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
