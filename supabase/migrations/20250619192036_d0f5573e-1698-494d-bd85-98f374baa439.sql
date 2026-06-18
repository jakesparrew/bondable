
-- Drop the existing sessions table and recreate it properly
DROP TABLE IF EXISTS public.sessions CASCADE;

-- Create the sessions table with proper foreign key relationships
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TIME,
  session_type TEXT NOT NULL,
  therapy_type TEXT,
  session_format TEXT CHECK (session_format IN ('In-Person', 'Video')),
  location TEXT,
  duration_minutes INTEGER DEFAULT 50,
  status TEXT CHECK (status IN ('Confirmed', 'Pending', 'Completed', 'Cancelled')) DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sessions
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

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at_trigger
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_sessions_updated_at();
