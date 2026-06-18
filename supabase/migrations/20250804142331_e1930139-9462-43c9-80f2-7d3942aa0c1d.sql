-- Fix RLS policies for sessions table to ensure proper authentication handling
-- Remove all existing policies first
DROP POLICY IF EXISTS "Therapists can manage their sessions" ON sessions;
DROP POLICY IF EXISTS "Clients can request sessions" ON sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON sessions;
DROP POLICY IF EXISTS "Therapists can view their sessions" ON sessions;
DROP POLICY IF EXISTS "Clients can view their sessions" ON sessions;
DROP POLICY IF EXISTS "Clients can update their sessions" ON sessions;

-- Create simplified, more robust RLS policies for sessions
CREATE POLICY "Therapists can manage sessions" ON sessions
  FOR ALL
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Clients can manage their sessions" ON sessions
  FOR ALL  
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Allow both therapists and clients to view sessions they're involved in
CREATE POLICY "Users can view their sessions" ON sessions
  FOR SELECT
  USING (therapist_id = auth.uid() OR client_id = auth.uid());