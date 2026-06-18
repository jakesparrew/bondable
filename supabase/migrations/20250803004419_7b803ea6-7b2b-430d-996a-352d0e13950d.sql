-- Final fix for the sequence permissions issue
-- Check current sequence state and fix it properly

-- First ensure we're working in the public schema
SET search_path TO public;

-- Drop sequence completely
DROP SEQUENCE IF EXISTS message_sequence_seq CASCADE;

-- Create sequence with explicit permissions from the start
CREATE SEQUENCE message_sequence_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Explicitly grant all permissions to all relevant roles
GRANT ALL PRIVILEGES ON SEQUENCE message_sequence_seq TO PUBLIC;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE message_sequence_seq TO anon;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE message_sequence_seq TO authenticated;
GRANT ALL ON SEQUENCE message_sequence_seq TO service_role;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
    BEFORE INSERT ON messages
    FOR EACH ROW 
    EXECUTE FUNCTION update_conversation_on_message();