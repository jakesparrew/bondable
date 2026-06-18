
-- First, ensure the avatars bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop all existing policies to start completely fresh
DROP POLICY IF EXISTS "Users can upload to avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create completely open policies for the avatars bucket for testing
CREATE POLICY "Allow all operations on avatars bucket" ON storage.objects
FOR ALL USING (bucket_id = 'avatars');
