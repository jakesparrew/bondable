-- Enhanced handle_new_user function to cleanup temporary clients
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Log the trigger execution
    RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
    RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
    
    -- Insert into profiles table with proper error handling
    INSERT INTO public.profiles (id, full_name, role, email, first_name, last_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 
                 CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name'),
                 'User'),
        CASE 
            WHEN (NEW.raw_user_meta_data->>'role') = 'therapist' THEN 'therapist'::user_role
            WHEN (NEW.raw_user_meta_data->>'role') = 'client' THEN 'client'::user_role
            ELSE 'client'::user_role
        END,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    
    RAISE LOG 'Profile created successfully for user: % with role: %', NEW.id, NEW.raw_user_meta_data->>'role';
    
    -- Cleanup temporary clients that match this new user
    -- Only do this if the user is a client (not a therapist)
    IF COALESCE((NEW.raw_user_meta_data->>'role'), 'client') = 'client' THEN
        RAISE LOG 'Checking for temporary clients to cleanup for email: % or name: % %', 
                  NEW.email, 
                  NEW.raw_user_meta_data->>'first_name', 
                  NEW.raw_user_meta_data->>'last_name';
        
        -- Delete temporary clients that match by email, first name, or last name
        DELETE FROM public.clients 
        WHERE status = 'Pending' 
        AND (
            email = NEW.email
            OR (
                first_name = (NEW.raw_user_meta_data->>'first_name')
                AND last_name = (NEW.raw_user_meta_data->>'last_name')
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