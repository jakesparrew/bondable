
-- First, let's check if we have proper foreign key constraints
-- and fix the client_therapist_relationships table structure

-- Update foreign key constraints to ensure proper relationships
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
DROP POLICY IF EXISTS "Therapists can view their relationships" ON public.client_therapist_relationships;
DROP POLICY IF EXISTS "Clients can view their relationships" ON public.client_therapist_relationships;
DROP POLICY IF EXISTS "Therapists can manage their relationships" ON public.client_therapist_relationships;

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

-- Ensure we have proper email and name data in profiles
-- Update any missing full_name fields based on first_name and last_name
UPDATE public.profiles 
SET full_name = CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
WHERE full_name IS NULL OR full_name = '' AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- Set default full_name for profiles without names
UPDATE public.profiles 
SET full_name = 'User ' || SUBSTRING(id::text, 1, 8)
WHERE full_name IS NULL OR full_name = '' OR TRIM(full_name) = '';
