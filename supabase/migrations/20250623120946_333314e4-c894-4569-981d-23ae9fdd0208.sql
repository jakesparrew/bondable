
-- First, let's check the current foreign key constraints and fix them
-- Remove existing foreign key constraints that might be pointing to auth.users
ALTER TABLE public.client_therapist_relationships 
DROP CONSTRAINT IF EXISTS client_therapist_relationships_client_id_fkey;

ALTER TABLE public.client_therapist_relationships 
DROP CONSTRAINT IF EXISTS client_therapist_relationships_therapist_id_fkey;

-- Add proper foreign key constraints to profiles table
ALTER TABLE public.client_therapist_relationships 
ADD CONSTRAINT client_therapist_relationships_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.client_therapist_relationships 
ADD CONSTRAINT client_therapist_relationships_therapist_id_fkey 
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure we have proper RLS policies for client_therapist_relationships
DROP POLICY IF EXISTS "Therapists can view their client relationships" ON public.client_therapist_relationships;
DROP POLICY IF EXISTS "Clients can view their therapist relationships" ON public.client_therapist_relationships;
DROP POLICY IF EXISTS "Therapists can manage client relationships" ON public.client_therapist_relationships;
DROP POLICY IF EXISTS "Clients can manage therapist relationships" ON public.client_therapist_relationships;

-- Create comprehensive RLS policies for client_therapist_relationships
CREATE POLICY "Therapists can view their client relationships" 
  ON public.client_therapist_relationships 
  FOR SELECT 
  USING (therapist_id = auth.uid());

CREATE POLICY "Clients can view their therapist relationships" 
  ON public.client_therapist_relationships 
  FOR SELECT 
  USING (client_id = auth.uid());

CREATE POLICY "Therapists can manage client relationships" 
  ON public.client_therapist_relationships 
  FOR ALL 
  USING (therapist_id = auth.uid());

CREATE POLICY "Clients can manage therapist relationships" 
  ON public.client_therapist_relationships 
  FOR ALL 
  USING (client_id = auth.uid());

-- Enable RLS on client_therapist_relationships if not already enabled
ALTER TABLE public.client_therapist_relationships ENABLE ROW LEVEL SECURITY;

-- Update conversations table foreign keys to reference profiles
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_client_id_fkey;

ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_therapist_id_fkey;

ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_therapist_id_fkey 
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update messages table foreign keys to reference profiles
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
