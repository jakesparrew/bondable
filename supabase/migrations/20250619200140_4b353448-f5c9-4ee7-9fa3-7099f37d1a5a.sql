
-- Create tasks table if it doesn't exist with proper structure
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in-progress', 'completed', 'overdue', 'denied')),
  due_date DATE NOT NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  denied_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks
-- Therapists can view all tasks they assigned
CREATE POLICY "Therapists can view their assigned tasks"
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'therapist'
      AND id = tasks.therapist_id
    )
  );

-- Clients can view tasks assigned to them
CREATE POLICY "Clients can view their tasks"
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'client'
      AND id = tasks.client_id
    )
  );

-- Therapists can insert tasks
CREATE POLICY "Therapists can create tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'therapist'
      AND id = therapist_id
    )
  );

-- Therapists can update their assigned tasks
CREATE POLICY "Therapists can update their tasks"
  ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'therapist'
      AND id = tasks.therapist_id
    )
  );

-- Clients can update status of tasks assigned to them
CREATE POLICY "Clients can update task status"
  ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'client'
      AND id = tasks.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'client'
      AND id = tasks.client_id
    )
  );

-- Therapists can delete their assigned tasks
CREATE POLICY "Therapists can delete their tasks"
  ON public.tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'therapist'
      AND id = tasks.therapist_id
    )
  );

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Add realtime support for tasks
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
