-- Create the missing trigger to call the function on message insert
CREATE TRIGGER trigger_update_conversation_on_message
    BEFORE INSERT ON public.messages
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_conversation_on_message();