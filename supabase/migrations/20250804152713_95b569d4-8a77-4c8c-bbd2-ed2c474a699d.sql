-- Add new field to track who made the current session request
ALTER TABLE public.sessions 
ADD COLUMN current_requester_id uuid REFERENCES auth.users(id);

-- Set initial values: for pending sessions, the requester is the client; for others, null
UPDATE public.sessions 
SET current_requester_id = client_id 
WHERE status = 'Pending';

-- Add comment for clarity
COMMENT ON COLUMN public.sessions.current_requester_id IS 'Tracks who made the current session request/update. The other party needs to respond to this request.';