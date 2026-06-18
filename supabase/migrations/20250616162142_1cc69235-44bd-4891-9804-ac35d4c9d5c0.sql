
-- First, drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Make sure the user_role enum exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('therapist', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the handle_new_user function with proper type handling
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
        COALESCE((NEW.raw_user_meta_data->>'role')::text::user_role, 'client'::user_role)
    );
    RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Make sure the profiles table has the correct structure
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'client'::user_role;
