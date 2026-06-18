-- Fix the search_path security issue for the session function
CREATE OR REPLACE FUNCTION public.set_session_created_by()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Set created_by to the current authenticated user if not specified
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$;