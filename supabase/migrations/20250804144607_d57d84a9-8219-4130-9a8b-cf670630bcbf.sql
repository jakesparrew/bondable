-- Add "Denied" status to sessions table status values
-- First check current status values and add Denied if not present
DO $$
BEGIN
  -- Add Denied to the status field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%sessions_status_check%' 
    AND constraint_definition LIKE '%Denied%'
  ) THEN
    -- Update the check constraint to include Denied status
    ALTER TABLE public.sessions 
    DROP CONSTRAINT IF EXISTS sessions_status_check;
    
    ALTER TABLE public.sessions 
    ADD CONSTRAINT sessions_status_check 
    CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show', 'Denied'));
  END IF;
END $$;