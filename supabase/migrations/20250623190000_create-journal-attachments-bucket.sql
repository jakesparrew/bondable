
-- Create a storage bucket for journal attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-attachments', 'journal-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for journal attachments storage
CREATE POLICY "Users can upload their own journal attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'journal-attachments' AND 
  auth.uid() IS NOT NULL AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own journal attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'journal-attachments' AND 
  (auth.uid() IS NOT NULL AND (string_to_array(name, '/'))[1] = auth.uid()::text)
);

CREATE POLICY "Users can update their own journal attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'journal-attachments' AND 
  auth.uid() IS NOT NULL AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own journal attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'journal-attachments' AND 
  auth.uid() IS NOT NULL AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);
