
-- Create a storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create a policy that allows users to upload their own avatars
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create a policy that allows users to view all avatars (since they're public)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Create a policy that allows users to update their own avatars
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create a policy that allows users to delete their own avatars
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add avatar_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN avatar_url TEXT;
