
-- First, let's update the sessions table to reference the profiles table instead of clients table
-- since clients are now stored in profiles and linked via client_therapist_relationships

-- Drop the existing foreign key constraint
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_client_id_fkey;

-- Add new foreign key constraint to profiles table
ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update the conversations RLS policy to work with the new structure
DROP POLICY IF EXISTS "Therapists can create conversations with their clients" ON public.conversations;

CREATE POLICY "Therapists can create conversations with their clients" ON public.conversations
  FOR INSERT WITH CHECK (
    therapist_id = auth.uid() AND 
    client_id IN (
      SELECT ctr.client_id 
      FROM public.client_therapist_relationships ctr 
      WHERE ctr.therapist_id = auth.uid() AND ctr.status = 'active'
    )
  );

-- Also update the RLS policy for viewing conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    therapist_id = auth.uid() OR 
    client_id = auth.uid()
  );

-- Add missing RLS policies for client_therapist_relationships foreign key references
-- Set up proper foreign key constraints for client_therapist_relationships
ALTER TABLE public.client_therapist_relationships DROP CONSTRAINT IF EXISTS client_therapist_relationships_client_id_fkey;
ALTER TABLE public.client_therapist_relationships DROP CONSTRAINT IF EXISTS client_therapist_relationships_therapist_id_fkey;

-- Add foreign key constraints to profiles table (since both clients and therapists are in profiles)
ALTER TABLE public.client_therapist_relationships 
ADD CONSTRAINT client_therapist_relationships_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.client_therapist_relationships 
ADD CONSTRAINT client_therapist_relationships_therapist_id_fkey 
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
