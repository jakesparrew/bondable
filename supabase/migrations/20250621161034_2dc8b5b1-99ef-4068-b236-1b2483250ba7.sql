
-- Fix the foreign key constraint for journal_entries.client_id to reference profiles instead of clients
ALTER TABLE public.journal_entries 
DROP CONSTRAINT IF EXISTS journal_entries_client_id_fkey;

ALTER TABLE public.journal_entries 
ADD CONSTRAINT journal_entries_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also fix the client_therapist_relationships foreign keys to ensure they reference profiles
ALTER TABLE public.client_therapist_relationships 
DROP CONSTRAINT IF EXISTS client_therapist_relationships_client_id_fkey;

ALTER TABLE public.client_therapist_relationships 
DROP CONSTRAINT IF EXISTS client_therapist_relationships_therapist_id_fkey;

ALTER TABLE public.client_therapist_relationships 
ADD CONSTRAINT client_therapist_relationships_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.client_therapist_relationships 
ADD CONSTRAINT client_therapist_relationships_therapist_id_fkey 
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add RLS policy for therapists to view shared journal entries
CREATE POLICY "Therapists can view shared journal entries from their clients"
  ON public.journal_entries
  FOR SELECT
  USING (
    sharing_type = 'therapist' AND
    EXISTS (
      SELECT 1 FROM public.client_therapist_relationships ctr
      WHERE ctr.client_id = journal_entries.client_id
      AND ctr.therapist_id = auth.uid()
      AND ctr.status = 'active'
    )
  );
