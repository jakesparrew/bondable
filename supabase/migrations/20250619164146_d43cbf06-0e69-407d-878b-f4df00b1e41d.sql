
-- First, let's check if the avatars bucket exists and create it if it doesn't
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create a more permissive policy for testing - users can upload to avatars bucket
CREATE POLICY "Users can upload to avatars bucket" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid() IS NOT NULL
);

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update files in avatars bucket
CREATE POLICY "Users can update avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid() IS NOT NULL
);

-- Allow users to delete files in avatars bucket
CREATE POLICY "Users can delete avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid() IS NOT NULL
);
