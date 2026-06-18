
-- Create attachments table for storing file metadata
CREATE TABLE public.message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'voice', 'video', 'pdf', 'image'
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds INTEGER NULL, -- For voice/video files
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on attachments table
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for message attachments
CREATE POLICY "Users can view attachments for their conversations" 
  ON public.message_attachments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m 
      JOIN public.conversations c ON m.conversation_id = c.id 
      WHERE m.id = message_id 
      AND (c.therapist_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create attachments for their messages" 
  ON public.message_attachments 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m 
      JOIN public.conversations c ON m.conversation_id = c.id 
      WHERE m.id = message_id 
      AND m.sender_id = auth.uid()
      AND (c.therapist_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own attachments" 
  ON public.message_attachments 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.id = message_id 
      AND m.sender_id = auth.uid()
    )
  );

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', false);

-- Create storage policies for message attachments
CREATE POLICY "Users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view attachments in their conversations" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-attachments' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM public.message_attachments ma
        JOIN public.messages m ON ma.message_id = m.id
        JOIN public.conversations c ON m.conversation_id = c.id
        WHERE ma.file_url = storage.objects.name
        AND (c.therapist_id = auth.uid() OR c.client_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete their own attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'message-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add trigger for updating message_attachments updated_at
CREATE TRIGGER update_message_attachments_updated_at
  BEFORE UPDATE ON public.message_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for message_attachments
ALTER TABLE public.message_attachments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
