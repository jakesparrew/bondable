
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create comprehensive RLS policies for profiles table
CREATE POLICY "Users can view their own profile" 
    ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id);

-- This is the key policy that was missing - allows users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile (optional but good to have)
CREATE POLICY "Users can delete their own profile" 
    ON public.profiles 
    FOR DELETE 
    USING (auth.uid() = id);
