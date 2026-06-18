
-- First, let's add the missing columns to support the current journal interface
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS attachments jsonb,
ADD COLUMN IF NOT EXISTS shared_with_therapists jsonb,
ADD COLUMN IF NOT EXISTS sharing_type text DEFAULT 'private' CHECK (sharing_type IN ('private', 'therapist'));

-- Update the existing is_shared_with_therapist logic to use the new sharing_type
UPDATE public.journal_entries 
SET sharing_type = CASE 
  WHEN is_shared_with_therapist = true THEN 'therapist'
  ELSE 'private'
END;

-- Add RLS policies for clients to manage their journal entries
CREATE POLICY "Clients can view their own journal entries"
  ON public.journal_entries
  FOR SELECT
  USING (
    client_id = auth.uid()
  );

CREATE POLICY "Clients can create their own journal entries"
  ON public.journal_entries
  FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
  );

CREATE POLICY "Clients can update their own journal entries"
  ON public.journal_entries
  FOR UPDATE
  USING (
    client_id = auth.uid()
  )
  WITH CHECK (
    client_id = auth.uid()
  );

CREATE POLICY "Clients can delete their own journal entries"
  ON public.journal_entries
  FOR DELETE
  USING (
    client_id = auth.uid()
  );

-- Enable RLS on journal_entries table
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
