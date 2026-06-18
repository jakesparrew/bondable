-- Fix trigger creation without IF NOT EXISTS
-- Drop then create to be idempotent
DROP TRIGGER IF EXISTS update_external_messages_updated_at ON public.external_messages;
CREATE TRIGGER update_external_messages_updated_at
BEFORE UPDATE ON public.external_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();