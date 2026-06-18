
-- First, let's check if there's an active relationship between the therapist and client
-- and add some debugging data

-- Check if there are any journal entries for this client at all
SELECT id, client_id, sharing_type, shared_with_therapists, title, content
FROM public.journal_entries 
WHERE client_id = 'd2b32ef5-d034-436e-9846-20f1ee93632f';

-- Check if there's a relationship between the therapist and this client
SELECT * 
FROM public.client_therapist_relationships 
WHERE client_id = 'd2b32ef5-d034-436e-9846-20f1ee93632f' 
AND therapist_id = 'af31c012-29d0-4149-ab14-41e4f6ce38f9'
AND status = 'active';

-- Check all relationships for this client
SELECT * 
FROM public.client_therapist_relationships 
WHERE client_id = 'd2b32ef5-d034-436e-9846-20f1ee93632f';

-- If no relationship exists, create one for testing
INSERT INTO public.client_therapist_relationships (client_id, therapist_id, status)
VALUES ('d2b32ef5-d034-436e-9846-20f1ee93632f', 'af31c012-29d0-4149-ab14-41e4f6ce38f9', 'active')
ON CONFLICT DO NOTHING;

-- Update the RLS policy to be more permissive for debugging
DROP POLICY IF EXISTS "Therapists can view shared journal entries from their clients" ON public.journal_entries;

CREATE POLICY "Therapists can view shared journal entries from their clients"
  ON public.journal_entries
  FOR SELECT
  TO authenticated
  USING (
    sharing_type = 'therapist' AND
    (
      -- Check if there's an active relationship
      EXISTS (
        SELECT 1 FROM public.client_therapist_relationships ctr
        WHERE ctr.client_id = journal_entries.client_id
        AND ctr.therapist_id = auth.uid()
        AND ctr.status = 'active'
      )
      OR
      -- Also allow if the therapist is specifically listed in shared_with_therapists
      (
        shared_with_therapists IS NOT NULL AND
        shared_with_therapists::jsonb ? auth.uid()::text
      )
    )
  );
