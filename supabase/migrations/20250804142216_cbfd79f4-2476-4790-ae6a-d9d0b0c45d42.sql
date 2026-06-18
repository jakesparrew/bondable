-- Fix RLS policies for sessions table to ensure proper authentication handling
-- First, let's check the current policies and make sure they're working correctly

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Therapists can manage their sessions" ON sessions;
DROP POLICY IF EXISTS "Clients can request sessions" ON sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON sessions;

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

-- Allow admins to view all sessions
CREATE POLICY "Admins can view all sessions" ON sessions
  FOR SELECT
  USING (get_user_role() = 'admin'::user_role);