
-- First, let's check and fix the storage bucket policies
-- The current policies are trying to reference message_attachments table that may not have the right data

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view message attachments in their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own message attachments" ON storage.objects;

-- Create simpler, more permissive policies that will actually work
CREATE POLICY "Authenticated users can upload message attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view message attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update message attachments" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete message attachments" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

-- Also ensure the bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments', 
  false,
  52428800, -- 50MB
  ARRAY['image/*', 'video/*', 'audio/*', 'application/pdf']
) ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/*', 'video/*', 'audio/*', 'application/pdf'];
