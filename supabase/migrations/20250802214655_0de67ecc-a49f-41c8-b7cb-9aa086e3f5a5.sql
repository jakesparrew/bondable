-- Continue fixing remaining database functions security vulnerabilities

-- Fix update_conversation_on_message function
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Set sequence number
  NEW.sequence_number = nextval('message_sequence_seq');
  
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
$function$;

-- Fix update_typing_status function
CREATE OR REPLACE FUNCTION public.update_typing_status(conversation_id uuid, user_id uuid, is_typing boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF is_typing THEN
    UPDATE public.conversations 
    SET typing_user_id = user_id, typing_at = NOW()
    WHERE id = conversation_id;
  ELSE
    UPDATE public.conversations 
    SET typing_user_id = NULL, typing_at = NULL
    WHERE id = conversation_id AND typing_user_id = user_id;
  END IF;
END;
$function$;

-- Fix mark_messages_as_read_new function
CREATE OR REPLACE FUNCTION public.mark_messages_as_read_new(conv_id uuid, reader_id uuid)
 RETURNS TABLE(updated_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update messages to read status
  UPDATE public.messages 
  SET 
    status = 'read',
    read_at = now(),
    updated_at = now()
  WHERE conversation_id = conv_id 
    AND recipient_id = reader_id 
    AND status != 'read';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Reset unread count for this user
  UPDATE public.conversations
  SET 
    unread_count_therapist = CASE 
      WHEN reader_id = therapist_id THEN 0
      ELSE unread_count_therapist
    END,
    unread_count_client = CASE 
      WHEN reader_id = client_id THEN 0
      ELSE unread_count_client
    END,
    updated_at = now()
  WHERE id = conv_id;
  
  RETURN QUERY SELECT updated_count;
END;
$function$;

-- Fix update_message_status function
CREATE OR REPLACE FUNCTION public.update_message_status(msg_id uuid, new_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Only allow valid status transitions
  UPDATE public.messages 
  SET 
    status = new_status,
    updated_at = NOW(),
    read_at = CASE 
      WHEN new_status = 'read' THEN NOW() 
      ELSE read_at 
    END
  WHERE id = msg_id
    AND (
      (status = 'sending' AND new_status IN ('sent', 'delivered', 'read')) OR
      (status = 'sent' AND new_status IN ('delivered', 'read')) OR
      (status = 'delivered' AND new_status = 'read')
    );
END;
$function$;