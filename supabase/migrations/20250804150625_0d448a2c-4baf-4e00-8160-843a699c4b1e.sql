-- Fix sessions table to ensure created_by is properly set
-- Make created_by non-nullable since it's critical for permissions
ALTER TABLE public.sessions ALTER COLUMN created_by SET NOT NULL;

-- Add a trigger to ensure created_by is always set when inserting sessions
CREATE OR REPLACE FUNCTION public.set_session_created_by()
RETURNS TRIGGER AS $$
BEGIN
    -- Set created_by to the current authenticated user if not specified
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set created_by
DROP TRIGGER IF EXISTS set_session_created_by_trigger ON public.sessions;
CREATE TRIGGER set_session_created_by_trigger
    BEFORE INSERT ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_session_created_by();

-- Update any existing sessions that have NULL created_by
-- Set to the therapist_id as a reasonable default
UPDATE public.sessions 
SET created_by = therapist_id 
WHERE created_by IS NULL;