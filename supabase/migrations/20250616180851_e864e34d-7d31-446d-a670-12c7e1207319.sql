
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.profiles;

-- Ensure RLS is enabled on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create the correct RLS policies with proper authentication checks
CREATE POLICY "Users can view their own profile" 
    ON public.profiles 
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles 
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id);

-- This is the critical policy that allows users to insert their own profile
CREATE POLICY "Allow insert for authenticated users"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" 
    ON public.profiles 
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = id);
