-- Fix the current_requester_id for existing sessions
-- For pending sessions created by therapist, set current_requester_id to therapist_id
-- For pending sessions without current_requester_id, assume they were created by client
UPDATE public.sessions 
SET current_requester_id = CASE 
  WHEN status = 'Pending' AND current_requester_id IS NULL AND created_by = therapist_id THEN therapist_id
  WHEN status = 'Pending' AND current_requester_id IS NULL THEN client_id
  ELSE current_requester_id
END;