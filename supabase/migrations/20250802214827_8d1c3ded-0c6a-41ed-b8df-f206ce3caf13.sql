-- Fix final batch of database functions with security vulnerabilities

-- Fix cleanup_stale_connections function
CREATE OR REPLACE FUNCTION public.cleanup_stale_connections()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- Fix update_admin_notification_settings_updated_at function
CREATE OR REPLACE FUNCTION public.update_admin_notification_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Fix grant_admin_access function
CREATE OR REPLACE FUNCTION public.grant_admin_access(user_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    -- Check if user exists in profiles
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = user_email) THEN
        RETURN 'User with email ' || user_email || ' does not exist';
    END IF;
    
    -- Grant admin access
    INSERT INTO public.admin_users (user_email)
    VALUES (user_email)
    ON CONFLICT (user_email) DO NOTHING;
    
    RETURN 'Admin access granted to ' || user_email;
END;
$function$;

-- Fix revoke_admin_access function
CREATE OR REPLACE FUNCTION public.revoke_admin_access(user_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    DELETE FROM public.admin_users WHERE user_email = user_email;
    RETURN 'Admin access revoked from ' || user_email;
END;
$function$;

-- Fix mark_message_as_sent function
CREATE OR REPLACE FUNCTION public.mark_message_as_sent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Update status to 'sent' immediately after insert
  UPDATE public.messages 
  SET status = 'sent', updated_at = now()
  WHERE id = NEW.id;
  
  -- Update conversation's last_message_at
  UPDATE public.conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$function$;