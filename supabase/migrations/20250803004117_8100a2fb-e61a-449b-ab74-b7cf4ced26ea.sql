-- Let's check what's wrong and create a simple version that should work
-- First test if we can create a simple trigger
CREATE OR REPLACE FUNCTION test_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Trigger fired for message: %', NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Test trigger
CREATE TRIGGER test_trigger
    BEFORE INSERT ON public.messages
    FOR EACH ROW 
    EXECUTE FUNCTION test_trigger_function();