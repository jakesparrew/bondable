
-- Change the duration_seconds column from integer to numeric to allow decimal values
ALTER TABLE public.message_attachments 
ALTER COLUMN duration_seconds TYPE NUMERIC(8,3);
