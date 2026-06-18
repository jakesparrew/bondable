
-- Add RLS policy to allow clients to update their own sessions
CREATE POLICY "Clients can update their sessions"
  ON public.sessions
  FOR UPDATE
  USING (
    auth.uid() = client_id
  );
