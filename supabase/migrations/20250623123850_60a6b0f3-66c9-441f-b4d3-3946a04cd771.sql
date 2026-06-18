
-- Fix RLS policies for conversations to allow both therapists and clients to create conversations
DROP POLICY IF EXISTS "Therapists can create conversations with their clients" ON public.conversations;
DROP POLICY IF EXISTS "Clients can create conversations with their therapists" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;

-- Allow therapists to create conversations with their connected clients
CREATE POLICY "Therapists can create conversations with their clients" ON public.conversations
  FOR INSERT WITH CHECK (
    therapist_id = auth.uid() AND 
    client_id IN (
      SELECT ctr.client_id 
      FROM public.client_therapist_relationships ctr 
      WHERE ctr.therapist_id = auth.uid() AND ctr.status = 'active'
    )
  );

-- Allow clients to create conversations with their connected therapists
CREATE POLICY "Clients can create conversations with their therapists" ON public.conversations
  FOR INSERT WITH CHECK (
    client_id = auth.uid() AND 
    therapist_id IN (
      SELECT ctr.therapist_id 
      FROM public.client_therapist_relationships ctr 
      WHERE ctr.client_id = auth.uid() AND ctr.status = 'active'
    )
  );

-- Allow users to view conversations they're part of
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    therapist_id = auth.uid() OR 
    client_id = auth.uid()
  );

-- Allow users to update conversations they're part of
CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE USING (
    therapist_id = auth.uid() OR 
    client_id = auth.uid()
  );

-- Fix RLS policies for client_therapist_relationships
DROP POLICY IF EXISTS "Users can view their relationships" ON public.client_therapist_relationships;
DROP POLICY IF EXISTS "Therapists can manage relationships" ON public.client_therapist_relationships;
DROP POLICY IF EXISTS "Clients can create relationships" ON public.client_therapist_relationships;
DROP POLICY IF EXISTS "Clients can manage therapist relationships" ON public.client_therapist_relationships;

CREATE POLICY "Users can view their relationships" ON public.client_therapist_relationships
  FOR SELECT USING (
    therapist_id = auth.uid() OR 
    client_id = auth.uid()
  );

CREATE POLICY "Therapists can manage relationships" ON public.client_therapist_relationships
  FOR ALL USING (
    therapist_id = auth.uid()
  );

CREATE POLICY "Clients can connect to therapists" ON public.client_therapist_relationships
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
  );

-- Fix sessions RLS policies to work with profiles table
DROP POLICY IF EXISTS "Therapists can view their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Clients can view their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Therapists can manage their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Clients can request sessions" ON public.sessions;

CREATE POLICY "Therapists can view their sessions" ON public.sessions
  FOR SELECT USING (
    therapist_id = auth.uid()
  );

CREATE POLICY "Clients can view their sessions" ON public.sessions
  FOR SELECT USING (
    client_id = auth.uid()
  );

CREATE POLICY "Therapists can manage their sessions" ON public.sessions
  FOR ALL USING (
    therapist_id = auth.uid()
  );

CREATE POLICY "Clients can request sessions" ON public.sessions
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
  );

-- Fix tasks RLS policies to work with profiles table
DROP POLICY IF EXISTS "Therapists can view their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Clients can view their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Therapists can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Therapists can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Clients can update task status" ON public.tasks;
DROP POLICY IF EXISTS "Therapists can delete their tasks" ON public.tasks;

CREATE POLICY "Therapists can view their assigned tasks" ON public.tasks
  FOR SELECT USING (
    therapist_id = auth.uid()
  );

CREATE POLICY "Clients can view their tasks" ON public.tasks
  FOR SELECT USING (
    client_id = auth.uid()
  );

CREATE POLICY "Therapists can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    therapist_id = auth.uid()
  );

CREATE POLICY "Therapists can update their tasks" ON public.tasks
  FOR UPDATE USING (
    therapist_id = auth.uid()
  );

CREATE POLICY "Clients can update task status" ON public.tasks
  FOR UPDATE USING (
    client_id = auth.uid()
  );

CREATE POLICY "Therapists can delete their tasks" ON public.tasks
  FOR DELETE USING (
    therapist_id = auth.uid()
  );

-- Fix journal entries RLS policies
DROP POLICY IF EXISTS "Clients can view their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Clients can create their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Clients can update their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Clients can delete their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Therapists can view shared journal entries" ON public.journal_entries;

CREATE POLICY "Clients can view their own journal entries" ON public.journal_entries
  FOR SELECT USING (
    client_id = auth.uid()
  );

CREATE POLICY "Clients can create their own journal entries" ON public.journal_entries
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
  );

CREATE POLICY "Clients can update their own journal entries" ON public.journal_entries
  FOR UPDATE USING (
    client_id = auth.uid()
  );

CREATE POLICY "Clients can delete their own journal entries" ON public.journal_entries
  FOR DELETE USING (
    client_id = auth.uid()
  );

CREATE POLICY "Therapists can view shared journal entries" ON public.journal_entries
  FOR SELECT USING (
    (sharing_type = 'specific' AND shared_with_therapists ? auth.uid()::text) OR
    (sharing_type = 'all' AND EXISTS (
      SELECT 1 FROM public.client_therapist_relationships 
      WHERE client_id = journal_entries.client_id 
      AND therapist_id = auth.uid() 
      AND status = 'active'
    ))
  );
