-- Fix sequence permissions for message_sequence_seq
GRANT ALL PRIVILEGES ON SEQUENCE public.message_sequence_seq TO authenticated;
GRANT ALL PRIVILEGES ON SEQUENCE public.message_sequence_seq TO anon;
GRANT ALL PRIVILEGES ON SEQUENCE public.message_sequence_seq TO service_role;