-- Fix the function to use the correct sequence reference
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Set sequence number with explicit schema reference
  NEW.sequence_number = nextval('public.message_sequence_seq'::regclass);
  
  -- Update conversation
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NEW.created_at,
    unread_count_therapist = CASE 
      WHEN NEW.recipient_id = therapist_id THEN unread_count_therapist + 1
      ELSE unread_count_therapist
    END,
    unread_count_client = CASE 
      WHEN NEW.recipient_id = client_id THEN unread_count_client + 1
      ELSE unread_count_client
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;