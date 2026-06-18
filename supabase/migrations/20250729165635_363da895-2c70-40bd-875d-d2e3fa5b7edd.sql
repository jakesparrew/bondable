-- Migration to remove full_name and populate first_name/last_name
-- First, let's update existing records to populate first_name and last_name from full_name
UPDATE public.profiles 
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND trim(full_name) != '' THEN
      CASE 
        WHEN position(' ' in trim(full_name)) > 0 THEN
          -- If there are spaces, take the last word as first_name
          reverse(split_part(reverse(trim(full_name)), ' ', 1))
        ELSE
          -- If no spaces, use the whole name as first_name
          trim(full_name)
      END
    ELSE first_name
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND trim(full_name) != '' THEN
      CASE 
        WHEN position(' ' in trim(full_name)) > 0 THEN
          -- If there are spaces, take everything except the last word as last_name
          reverse(substring(reverse(trim(full_name)) from position(' ' in reverse(trim(full_name))) + 1))
        ELSE
          -- If no spaces, leave last_name as is or empty
          COALESCE(last_name, '')
      END
    ELSE last_name
  END
WHERE full_name IS NOT NULL AND trim(full_name) != '';

-- Now drop the full_name column
ALTER TABLE public.profiles DROP COLUMN full_name;

-- Update the handle_new_user function to not use full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    cleanup_count INTEGER := 0;
    user_first_name TEXT;
    user_last_name TEXT;
BEGIN
    -- Log the trigger execution
    RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
    RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
    
    -- Extract names from metadata
    user_first_name := NEW.raw_user_meta_data->>'first_name';
    user_last_name := NEW.raw_user_meta_data->>'last_name';
    
    -- Insert into profiles table with proper error handling
    INSERT INTO public.profiles (id, role, email, first_name, last_name)
    VALUES (
        NEW.id,
        CASE 
            WHEN (NEW.raw_user_meta_data->>'role') = 'therapist' THEN 'therapist'::user_role
            WHEN (NEW.raw_user_meta_data->>'role') = 'client' THEN 'client'::user_role
            ELSE 'client'::user_role
        END,
        NEW.email,
        user_first_name,
        user_last_name
    );
    
    RAISE LOG 'Profile created successfully for user: % with role: %', NEW.id, NEW.raw_user_meta_data->>'role';
    
    -- Cleanup temporary clients that match this new user
    -- Only do this if the user is a client (not a therapist)
    IF COALESCE((NEW.raw_user_meta_data->>'role'), 'client') = 'client' THEN
        RAISE LOG 'Checking for temporary clients to cleanup for email: % or name: % %', 
                  NEW.email, 
                  user_first_name, 
                  user_last_name;
        
        -- Delete temporary clients that match by email, first name, or last name
        DELETE FROM public.clients 
        WHERE status = 'Pending' 
        AND (
            email = NEW.email
            OR (
                first_name = user_first_name
                AND last_name = user_last_name
            )
        );
        
        GET DIAGNOSTICS cleanup_count = ROW_COUNT;
        
        IF cleanup_count > 0 THEN
            RAISE LOG 'Cleaned up % temporary client(s) for user: %', cleanup_count, NEW.id;
        ELSE
            RAISE LOG 'No temporary clients found to cleanup for user: %', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the detailed error but don't block user creation
        RAISE LOG 'Error in handle_new_user for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
        -- Still return NEW to allow user creation to continue
        RETURN NEW;
END;
$function$;