
-- Fix the handle_new_user function to properly handle the role conversion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        CASE 
            WHEN (NEW.raw_user_meta_data->>'role') = 'therapist' THEN 'therapist'::user_role
            WHEN (NEW.raw_user_meta_data->>'role') = 'client' THEN 'client'::user_role
            ELSE 'client'::user_role
        END
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't block user creation
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$function$;
