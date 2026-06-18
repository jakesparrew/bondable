
-- Drop existing message-related tables to rebuild from scratch
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Create conversations table with real-time support
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(therapist_id, client_id)
);

-- Create messages table with status tracking
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'app' CHECK (message_type IN ('app', 'sms', 'ai')),
  status TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'delivered', 'read')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create message_attachments table
CREATE TABLE public.message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds NUMERIC NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Conversations RLS policies
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    auth.uid() = therapist_id OR auth.uid() = client_id
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = therapist_id OR auth.uid() = client_id
  );

CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE USING (
    auth.uid() = therapist_id OR auth.uid() = client_id
  );

-- Messages RLS policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (auth.uid() = therapist_id OR auth.uid() = client_id)
    )
  );

CREATE POLICY "Users can insert messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (auth.uid() = therapist_id OR auth.uid() = client_id)
    )
  );

CREATE POLICY "Users can update message status" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (auth.uid() = therapist_id OR auth.uid() = client_id)
    )
  );

-- Message attachments RLS policies
CREATE POLICY "Users can view attachments for their messages" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id 
      AND (auth.uid() = c.therapist_id OR auth.uid() = c.client_id)
    )
  );

CREATE POLICY "Users can insert attachments for their messages" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id 
      AND auth.uid() = m.sender_id
      AND (auth.uid() = c.therapist_id OR auth.uid() = c.client_id)
    )
  );

-- Create function to automatically mark message as sent after insert
CREATE OR REPLACE FUNCTION mark_message_as_sent()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status to 'sent' immediately after insert
  UPDATE public.messages 
  SET status = 'sent', updated_at = now()
  WHERE id = NEW.id;
  
  -- Update conversation's last_message_at
  UPDATE public.conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to mark messages as sent
CREATE TRIGGER message_sent_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_message_as_sent();

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(conv_id UUID, reader_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.messages 
  SET 
    status = 'read',
    read_at = now(),
    updated_at = now()
  WHERE conversation_id = conv_id 
    AND recipient_id = reader_id 
    AND status != 'read';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for all tables
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_attachments REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
