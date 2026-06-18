
-- First, let's check what policies already exist for the clients table
-- and then create only the missing ones

-- Drop any existing policies first to avoid conflicts, then recreate them all
DROP POLICY IF EXISTS "Therapists can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can delete their own clients" ON public.clients;

-- Now create all policies fresh
CREATE POLICY "Therapists can view their own clients"
ON public.clients
FOR SELECT
TO authenticated
USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can insert their own clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can update their own clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can delete their own clients"
ON public.clients
FOR DELETE
TO authenticated
USING (therapist_id = auth.uid());
