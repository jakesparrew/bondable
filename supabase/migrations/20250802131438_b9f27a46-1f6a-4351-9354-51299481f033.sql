-- Make priority nullable in tasks table to allow optional priority
ALTER TABLE public.tasks 
ALTER COLUMN priority DROP NOT NULL;