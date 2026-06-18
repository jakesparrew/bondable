-- Improve the handle_new_user trigger to be more robust with metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    cleanup_count INTEGER := 0;
    user_first_name TEXT;
    user_last_name TEXT;
    full_name_fallback TEXT;
    user_role user_role;
BEGIN
    -- Log the trigger execution
    RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
    RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
    
    -- Extract role first
    user_role := CASE 
        WHEN (NEW.raw_user_meta_data->>'role') = 'therapist' THEN 'therapist'::user_role
        WHEN (NEW.raw_user_meta_data->>'role') = 'client' THEN 'client'::user_role
        ELSE 'client'::user_role
    END;
    
    -- Extract names with multiple fallback strategies
    user_first_name := NEW.raw_user_meta_data->>'first_name';
    user_last_name := NEW.raw_user_meta_data->>'last_name';
    
    -- If no first/last name, try to extract from full_name
    IF user_first_name IS NULL OR user_first_name = '' THEN
        full_name_fallback := COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            'User'
        );
        
        -- Split full name into parts
        IF position(' ' in trim(full_name_fallback)) > 0 THEN
            user_first_name := split_part(trim(full_name_fallback), ' ', 1);
            user_last_name := trim(replace(full_name_fallback, split_part(trim(full_name_fallback), ' ', 1), ''));
        ELSE
            user_first_name := trim(full_name_fallback);
            user_last_name := '';
        END IF;
    END IF;
    
    -- Ensure we have at least a first name
    IF user_first_name IS NULL OR user_first_name = '' THEN
        user_first_name := 'User';
    END IF;
    
    -- Insert into profiles table with proper error handling
    INSERT INTO public.profiles (id, role, email, first_name, last_name)
    VALUES (
        NEW.id,
        user_role,
        NEW.email,
        user_first_name,
        COALESCE(user_last_name, '')
    );
    
    RAISE LOG 'Profile created successfully for user: % with role: % name: % %', NEW.id, user_role, user_first_name, user_last_name;
    
    -- Cleanup temporary clients that match this new user
    -- Only do this if the user is a client (not a therapist)
    IF user_role = 'client' THEN
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