
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Therapists can create conversations with their clients" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create proper RLS policies for conversations
CREATE POLICY "Users can view conversations they are part of" ON public.conversations
  FOR SELECT USING (
    therapist_id = auth.uid() OR client_id = auth.uid()
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    therapist_id = auth.uid() OR client_id = auth.uid()
  );

CREATE POLICY "Users can update conversations they are part of" ON public.conversations
  FOR UPDATE USING (
    therapist_id = auth.uid() OR client_id = auth.uid()
  );

-- Create proper RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.therapist_id = auth.uid() OR conversations.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.therapist_id = auth.uid() OR conversations.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update messages they sent" ON public.messages
  FOR UPDATE USING (
    sender_id = auth.uid()
  );
