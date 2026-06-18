
-- First, let's check what RLS policies exist and recreate them properly
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Therapists can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can delete their own clients" ON public.clients;

-- Make sure RLS is enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies with correct syntax
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
USING (therapist_id = auth.uid())
WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can delete their own clients"
ON public.clients
FOR DELETE
TO authenticated
USING (therapist_id = auth.uid());

-- Let's also verify the table structure to ensure therapist_id column exists and is properly configured
ALTER TABLE public.clients 
ALTER COLUMN therapist_id SET NOT NULL;

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_clients_therapist_id ON public.clients(therapist_id);
