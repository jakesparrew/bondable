
-- First, let's make sure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handle_new_user function with better error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Log the trigger execution
    RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
    RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
    
    -- Insert into profiles table
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
    
    RAISE LOG 'Profile created successfully for user: %', NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the detailed error but don't block user creation
        RAISE LOG 'Error in handle_new_user for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
    ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id);
