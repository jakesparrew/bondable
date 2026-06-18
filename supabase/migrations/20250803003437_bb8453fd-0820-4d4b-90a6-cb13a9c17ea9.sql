-- Create trigger to update conversation and set sequence number on message insert
CREATE OR REPLACE TRIGGER trigger_update_conversation_on_message
    BEFORE INSERT ON public.messages
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_conversation_on_message();