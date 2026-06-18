-- Fix remaining database functions with security vulnerabilities

-- Fix mark_messages_as_read function
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(conv_id uuid, reader_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- Fix is_admin_user function
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Check if current user email exists in admin_users table
  -- Using security definer bypasses RLS policies
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );
END;
$function$;

-- Fix get_current_user_email function
CREATE OR REPLACE FUNCTION public.get_current_user_email()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$function$;

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$function$;

-- Fix audit_trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Only log operations by authenticated users
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, OLD.id::text),
      CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;