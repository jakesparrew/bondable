
-- Create messages table for real-time chat between therapists and clients
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'app' CHECK (message_type IN ('app', 'sms', 'ai')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create conversations table to track message threads between users
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(therapist_id, client_id)
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages - users can only see messages they sent or received
CREATE POLICY "Users can view their own messages" ON public.messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can insert their own messages" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- RLS Policies for conversations - users can only see conversations they're part of
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (therapist_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Therapists can create conversations with their clients" ON public.conversations
  FOR INSERT WITH CHECK (
    therapist_id = auth.uid() AND 
    client_id IN (SELECT id FROM public.clients WHERE therapist_id = auth.uid())
  );

CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE USING (therapist_id = auth.uid() OR client_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_conversations_therapist_id ON public.conversations(therapist_id);
CREATE INDEX idx_conversations_client_id ON public.conversations(client_id);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for messages and conversations
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
