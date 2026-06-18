
-- Add missing columns to sessions table to match the UI requirements
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS session_time TIME,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS session_format TEXT CHECK (session_format IN ('In-Person', 'Video')),
ADD COLUMN IF NOT EXISTS therapy_type TEXT;

-- Update existing sessions to have proper status values that match the UI
UPDATE public.sessions 
SET status = CASE 
  WHEN status = 'Scheduled' THEN 'Confirmed'
  ELSE status
END;

-- Drop existing constraint if it exists and recreate it
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_status_check 
CHECK (status IN ('Confirmed', 'Pending', 'Completed', 'Cancelled'));

-- Add RLS policies for sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Therapists can view their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Clients can view their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Therapists can manage their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Clients can request sessions" ON public.sessions;

-- Policy for therapists to see all their sessions
CREATE POLICY "Therapists can view their sessions" 
  ON public.sessions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'therapist'
      AND profiles.id = sessions.therapist_id
    )
  );

-- Policy for clients to see their own sessions
CREATE POLICY "Clients can view their sessions" 
  ON public.sessions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'client'
      AND profiles.id = sessions.client_id
    )
  );

-- Policy for therapists to manage their sessions
CREATE POLICY "Therapists can manage their sessions" 
  ON public.sessions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'therapist'
      AND profiles.id = sessions.therapist_id
    )
  );

-- Policy for clients to create session requests
CREATE POLICY "Clients can request sessions" 
  ON public.sessions 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'client'
      AND profiles.id = sessions.client_id
    )
  );
