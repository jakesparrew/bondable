-- Create local_documents table and storage setup for therapist local documents
-- 1) Table
CREATE TABLE IF NOT EXISTS public.local_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- image | video | pdf | other
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL, -- storage path within bucket
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_local_docs_user
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.local_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'local_documents' AND policyname = 'Users can view their own local documents'
  ) THEN
    CREATE POLICY "Users can view their own local documents"
    ON public.local_documents
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'local_documents' AND policyname = 'Users can insert their own local documents'
  ) THEN
    CREATE POLICY "Users can insert their own local documents"
    ON public.local_documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'local_documents' AND policyname = 'Users can update their own local documents'
  ) THEN
    CREATE POLICY "Users can update their own local documents"
    ON public.local_documents
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'local_documents' AND policyname = 'Users can delete their own local documents'
  ) THEN
    CREATE POLICY "Users can delete their own local documents"
    ON public.local_documents
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_local_documents_updated_at'
  ) THEN
    CREATE TRIGGER update_local_documents_updated_at
    BEFORE UPDATE ON public.local_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Storage bucket for local documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('local-documents', 'local-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bucket
-- SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Local documents are viewable by owner'
  ) THEN
    CREATE POLICY "Local documents are viewable by owner"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'local-documents'
      AND auth.role() = 'authenticated'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
  
  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own local documents'
  ) THEN
    CREATE POLICY "Users can upload their own local documents"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'local-documents'
      AND auth.role() = 'authenticated'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
  
  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own local documents'
  ) THEN
    CREATE POLICY "Users can update their own local documents"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'local-documents'
      AND auth.role() = 'authenticated'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
  
  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own local documents'
  ) THEN
    CREATE POLICY "Users can delete their own local documents"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'local-documents'
      AND auth.role() = 'authenticated'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;