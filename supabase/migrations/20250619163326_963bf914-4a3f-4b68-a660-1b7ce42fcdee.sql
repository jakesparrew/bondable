
-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create new policies with better path handling
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Create a policy that allows users to view all avatars (since they're public)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Create a policy that allows users to update their own avatars
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Create a policy that allows users to delete their own avatars
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
