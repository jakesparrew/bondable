-- Make due_date nullable in tasks table to allow optional due dates
ALTER TABLE public.tasks 
ALTER COLUMN due_date DROP NOT NULL;