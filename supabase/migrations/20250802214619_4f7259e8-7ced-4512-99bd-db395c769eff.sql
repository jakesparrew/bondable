-- Fix database function security vulnerabilities
-- Add SET search_path = '' to all functions to prevent SQL injection

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
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

-- Fix update_sessions_updated_at function
CREATE OR REPLACE FUNCTION public.update_sessions_updated_at()
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

-- Fix generate_invite_code function
CREATE OR REPLACE FUNCTION public.generate_invite_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$function$;

-- Fix update_tasks_updated_at function
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix set_therapist_invite_code function
CREATE OR REPLACE FUNCTION public.set_therapist_invite_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    -- Only generate invite code for therapists
    IF NEW.role = 'therapist' AND NEW.invite_code IS NULL THEN
        LOOP
            NEW.invite_code := generate_invite_code();
            -- Check if this code already exists
            IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = NEW.invite_code) THEN
                EXIT;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$function$;