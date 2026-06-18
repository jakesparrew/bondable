-- Add "Denied" status to the sessions table
-- First, remove any existing check constraint
ALTER TABLE public.sessions 
DROP CONSTRAINT IF EXISTS sessions_status_check;

-- Add the new constraint with "Denied" included
ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_status_check 
CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show', 'Denied'));