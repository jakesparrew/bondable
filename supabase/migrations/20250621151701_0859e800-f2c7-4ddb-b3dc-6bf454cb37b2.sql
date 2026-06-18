
-- Check if there are existing RLS policies for tasks
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'tasks';

-- Add RLS policy for clients to view their own tasks
CREATE POLICY "Clients can view their assigned tasks"
  ON public.tasks
  FOR SELECT
  USING (
    auth.uid() = client_id
  );

-- Also allow clients to update their task status
CREATE POLICY "Clients can update their task status"
  ON public.tasks
  FOR UPDATE
  USING (
    auth.uid() = client_id
  )
  WITH CHECK (
    auth.uid() = client_id
  );
