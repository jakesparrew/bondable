-- Create message sequence for maintaining message order
CREATE SEQUENCE IF NOT EXISTS message_sequence_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Grant usage permissions on the sequence
GRANT USAGE, SELECT ON SEQUENCE message_sequence_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE message_sequence_seq TO anon;