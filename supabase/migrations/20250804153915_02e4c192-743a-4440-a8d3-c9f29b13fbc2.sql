-- COMPLETELY DELETE AND REBUILD SESSION SYSTEM FROM SCRATCH

-- Drop all existing session-related tables and recreate with a much better design
DROP TABLE IF EXISTS public.sessions CASCADE;

-- Create a much better session management system
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session details
  session_date date NOT NULL,
  session_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 50,
  session_type text NOT NULL,
  session_format text,
  therapy_type text,
  location text,
  notes text,
  
  -- NEW SIMPLE STATE MACHINE
  status text NOT NULL DEFAULT 'client_requested' CHECK (status IN (
    'client_requested',     -- Client made initial request
    'therapist_confirmed',  -- Therapist confirmed the session
    'therapist_requested_update', -- Therapist wants to change something
    'client_confirmed_update',    -- Client approved therapist's update
    'denied',              -- Either party denied
    'completed'            -- Session is done
  )),
  
  -- Track who needs to respond
  waiting_for_response_from uuid REFERENCES auth.users(id),
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Create simple, clear RLS policies
CREATE POLICY "Users can view their own sessions" 
ON public.sessions FOR SELECT 
USING (auth.uid() = client_id OR auth.uid() = therapist_id);

CREATE POLICY "Users can insert sessions" 
ON public.sessions FOR INSERT 
WITH CHECK (auth.uid() = client_id OR auth.uid() = therapist_id);

CREATE POLICY "Users can update their own sessions" 
ON public.sessions FOR UPDATE 
USING (auth.uid() = client_id OR auth.uid() = therapist_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.sessions FOR DELETE 
USING (auth.uid() = client_id OR auth.uid() = therapist_id);

-- Create indexes for performance
CREATE INDEX idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX idx_sessions_therapist_id ON public.sessions(therapist_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_date ON public.sessions(session_date);

-- Create trigger for updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();