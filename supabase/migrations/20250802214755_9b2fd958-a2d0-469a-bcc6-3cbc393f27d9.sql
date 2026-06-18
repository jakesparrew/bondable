-- Fix remaining database functions with security vulnerabilities

-- Fix mark_message_delivered function
CREATE OR REPLACE FUNCTION public.mark_message_delivered(msg_id uuid, recipient_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.messages 
  SET 
    status = 'delivered',
    updated_at = NOW()
  WHERE id = msg_id 
    AND recipient_id = recipient_user_id 
    AND status = 'sent';
END;
$function$;

-- Fix mark_messages_as_read_enhanced function
CREATE OR REPLACE FUNCTION public.mark_messages_as_read_enhanced(conv_id uuid, reader_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Mark messages as read and set read timestamp
  UPDATE public.messages 
  SET 
    status = 'read',
    read_at = NOW(),
    updated_at = NOW()
  WHERE conversation_id = conv_id 
    AND recipient_id = reader_id 
    AND status IN ('sent', 'delivered')
    AND status != 'read';
END;
$function$;

-- Fix update_message_status_instantly function
CREATE OR REPLACE FUNCTION public.update_message_status_instantly()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- Fix mark_conversation_messages_read function
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(conv_id uuid, reader_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;