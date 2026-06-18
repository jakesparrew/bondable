-- Security Enhancement Migration Part 5
-- Secure storage and audit logging

-- Make journal-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'journal-attachments';

-- Add storage policies for journal-attachments (now private)
CREATE POLICY "Users can view their own journal attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'journal-attachments' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Allow therapists to view attachments from their clients' journals that are shared
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.attachments ? name
      AND (
        (je.sharing_type = 'all' AND EXISTS (
          SELECT 1 FROM client_therapist_relationships ctr 
          WHERE ctr.client_id = je.client_id 
          AND ctr.therapist_id = auth.uid() 
          AND ctr.status = 'active'
        )) OR
        (je.sharing_type = 'specific' AND je.shared_with_therapists ? auth.uid()::text)
      )
    )
  )
);

CREATE POLICY "Users can upload their own journal attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'journal-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own journal attachments" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'journal-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own journal attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'journal-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);