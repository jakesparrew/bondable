
-- Create a security definer function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Create RLS policies for profiles table
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" 
  ON public.profiles 
  FOR DELETE 
  USING (auth.uid() = id);

-- Enable RLS on tables that don't have it yet
ALTER TABLE public.client_therapist_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for client_therapist_relationships
CREATE POLICY "Therapists can view their relationships" 
  ON public.client_therapist_relationships 
  FOR SELECT 
  USING (therapist_id = auth.uid());

CREATE POLICY "Clients can view their relationships" 
  ON public.client_therapist_relationships 
  FOR SELECT 
  USING (client_id = auth.uid());

CREATE POLICY "Therapists can manage their relationships" 
  ON public.client_therapist_relationships 
  FOR ALL 
  USING (therapist_id = auth.uid());

-- Create RLS policies for conversations
CREATE POLICY "Therapists can view their conversations" 
  ON public.conversations 
  FOR SELECT 
  USING (therapist_id = auth.uid());

CREATE POLICY "Clients can view their conversations" 
  ON public.conversations 
  FOR SELECT 
  USING (client_id = auth.uid());

CREATE POLICY "Therapists can manage their conversations" 
  ON public.conversations 
  FOR ALL 
  USING (therapist_id = auth.uid());

CREATE POLICY "Clients can manage their conversations" 
  ON public.conversations 
  FOR ALL 
  USING (client_id = auth.uid());

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" 
  ON public.messages 
  FOR SELECT 
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid()
  );

CREATE POLICY "Users can send messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages" 
  ON public.messages 
  FOR UPDATE 
  USING (sender_id = auth.uid());

-- Create RLS policies for journal_entries
CREATE POLICY "Clients can view their own journal entries" 
  ON public.journal_entries 
  FOR SELECT 
  USING (client_id = auth.uid());

CREATE POLICY "Clients can manage their own journal entries" 
  ON public.journal_entries 
  FOR ALL 
  USING (client_id = auth.uid());

-- Critical policy: Therapists can view shared journal entries from their clients
CREATE POLICY "Therapists can view shared journal entries from their clients" 
  ON public.journal_entries 
  FOR SELECT 
  USING (
    is_shared_with_therapist = true AND 
    EXISTS (
      SELECT 1 FROM public.client_therapist_relationships ctr
      WHERE ctr.client_id = journal_entries.client_id 
      AND ctr.therapist_id = auth.uid()
      AND ctr.status = 'active'
    )
  );
