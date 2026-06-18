
-- Update the conversations table to reference profiles instead of clients
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_client_id_fkey;

ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update the RLS policy to work with the new structure
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
