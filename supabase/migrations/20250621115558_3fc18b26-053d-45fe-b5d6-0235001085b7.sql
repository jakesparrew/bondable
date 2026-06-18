
-- First, let's drop the existing foreign key constraints
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_therapist_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_client_id_fkey;

-- Now let's add the correct foreign key constraints
-- therapist_id should reference profiles table (since therapists are in profiles)
ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_therapist_id_fkey 
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- client_id should reference clients table (since that's where client records are stored)
ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Update RLS policy for conversations to work with the new structure
DROP POLICY IF EXISTS "Therapists can create conversations with their clients" ON public.conversations;

CREATE POLICY "Therapists can create conversations with their clients" ON public.conversations
  FOR INSERT WITH CHECK (
    therapist_id = auth.uid() AND 
    client_id IN (SELECT id FROM public.clients WHERE therapist_id = auth.uid())
  );
