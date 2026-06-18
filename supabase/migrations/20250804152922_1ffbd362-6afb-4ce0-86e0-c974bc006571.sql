-- Make created_by nullable and set default value
ALTER TABLE public.sessions 
ALTER COLUMN created_by DROP NOT NULL;

-- Update all sessions to have current_requester_id set properly
-- For pending sessions: current_requester_id = client_id (who made the original request)
-- For other statuses: current_requester_id = NULL (no active request)
UPDATE public.sessions 
SET current_requester_id = CASE 
  WHEN status = 'Pending' THEN client_id
  ELSE NULL
END;