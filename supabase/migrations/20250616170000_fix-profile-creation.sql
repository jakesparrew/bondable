
-- Drop the existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Log the trigger execution
    RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
    RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
    
    -- Insert into profiles table with proper error handling
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 
                 CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name'),
                 'User'),
        CASE 
            WHEN (NEW.raw_user_meta_data->>'role') = 'therapist' THEN 'therapist'::user_role
            WHEN (NEW.raw_user_meta_data->>'role') = 'client' THEN 'client'::user_role
            ELSE 'client'::user_role
        END
    );
    
    RAISE LOG 'Profile created successfully for user: % with role: %', NEW.id, NEW.raw_user_meta_data->>'role';
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the detailed error but don't block user creation
        RAISE LOG 'Error in handle_new_user for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
        -- Still return NEW to allow user creation to continue
        RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies are correct
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

-- Allow users to insert their own profile (needed for manual creation if trigger fails)
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);
