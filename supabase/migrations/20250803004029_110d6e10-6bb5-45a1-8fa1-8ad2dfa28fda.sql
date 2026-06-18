-- Drop and recreate the sequence with proper permissions and the trigger
DROP SEQUENCE IF EXISTS public.message_sequence_seq CASCADE;

-- Create message sequence for maintaining message order
CREATE SEQUENCE public.message_sequence_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1
  OWNED BY public.messages.sequence_number;

-- Grant proper permissions
GRANT ALL ON SEQUENCE public.message_sequence_seq TO authenticated;
GRANT ALL ON SEQUENCE public.message_sequence_seq TO anon;
GRANT ALL ON SEQUENCE public.message_sequence_seq TO service_role;

-- Create the trigger to call the function on message insert
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
    BEFORE INSERT ON public.messages
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_conversation_on_message();