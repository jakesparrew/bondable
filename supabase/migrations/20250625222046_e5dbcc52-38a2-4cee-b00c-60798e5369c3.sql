
-- Add the created_by column to the sessions table
ALTER TABLE public.sessions 
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Add an index for better query performance
CREATE INDEX idx_sessions_created_by ON public.sessions(created_by);
