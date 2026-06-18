-- Update the check constraint to include the new client_requested_update status
ALTER TABLE sessions 
DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE sessions 
ADD CONSTRAINT sessions_status_check 
CHECK (status IN (
  'client_requested',
  'therapist_confirmed', 
  'therapist_requested_update',
  'client_requested_update',
  'client_confirmed_update',
  'denied',
  'completed'
));