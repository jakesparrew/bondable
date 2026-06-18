
-- Create clients table to store client information
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT CHECK (status IN ('Active', 'Inactive', 'Pending')) DEFAULT 'Pending',
  join_date DATE DEFAULT CURRENT_DATE,
  last_session DATE,
  next_session TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT,
  notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sessions table to store therapy session records
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  therapist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  session_type TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 50,
  notes TEXT,
  status TEXT CHECK (status IN ('Completed', 'Scheduled', 'Cancelled', 'No Show')) DEFAULT 'Scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create journal entries table for client shared journals
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT,
  entry_date DATE DEFAULT CURRENT_DATE,
  is_shared_with_therapist BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tasks table for client assignments
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  therapist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Overdue')) DEFAULT 'Pending',
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Therapists can view their own clients" ON public.clients
  FOR SELECT USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can insert their own clients" ON public.clients
  FOR INSERT WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can update their own clients" ON public.clients
  FOR UPDATE USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can delete their own clients" ON public.clients
  FOR DELETE USING (therapist_id = auth.uid());

-- RLS Policies for sessions table
CREATE POLICY "Therapists can view sessions for their clients" ON public.sessions
  FOR SELECT USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can insert sessions for their clients" ON public.sessions
  FOR INSERT WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can update sessions for their clients" ON public.sessions
  FOR UPDATE USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can delete sessions for their clients" ON public.sessions
  FOR DELETE USING (therapist_id = auth.uid());

-- RLS Policies for journal entries table
CREATE POLICY "Therapists can view shared journal entries from their clients" ON public.journal_entries
  FOR SELECT USING (
    is_shared_with_therapist = true AND 
    client_id IN (SELECT id FROM public.clients WHERE therapist_id = auth.uid())
  );

-- RLS Policies for tasks table
CREATE POLICY "Therapists can view tasks for their clients" ON public.tasks
  FOR SELECT USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can insert tasks for their clients" ON public.tasks
  FOR INSERT WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can update tasks for their clients" ON public.tasks
  FOR UPDATE USING (therapist_id = auth.uid());

CREATE POLICY "Therapists can delete tasks for their clients" ON public.tasks
  FOR DELETE USING (therapist_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_clients_therapist_id ON public.clients(therapist_id);
CREATE INDEX idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX idx_sessions_therapist_id ON public.sessions(therapist_id);
CREATE INDEX idx_journal_entries_client_id ON public.journal_entries(client_id);
CREATE INDEX idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX idx_tasks_therapist_id ON public.tasks(therapist_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
