
-- Disable Row Level Security on the profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies since we're disabling RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.profiles;
