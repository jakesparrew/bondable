-- Clean up and fix the messaging system properly
-- First, drop the conflicting triggers
DROP TRIGGER IF EXISTS update_message_status_trigger ON public.messages;
DROP TRIGGER IF EXISTS test_trigger ON public.messages;

-- Drop and recreate the sequence with the right owner
DROP SEQUENCE IF EXISTS public.message_sequence_seq CASCADE;

-- Create the sequence properly
CREATE SEQUENCE public.message_sequence_seq;

-- Set proper ownership and permissions
ALTER SEQUENCE public.message_sequence_seq OWNER TO postgres;
GRANT ALL ON SEQUENCE public.message_sequence_seq TO postgres;
GRANT ALL ON SEQUENCE public.message_sequence_seq TO authenticated;  
GRANT ALL ON SEQUENCE public.message_sequence_seq TO anon;
GRANT ALL ON SEQUENCE public.message_sequence_seq TO service_role;

-- Ensure the trigger exists and works
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
    BEFORE INSERT ON public.messages
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_conversation_on_message();