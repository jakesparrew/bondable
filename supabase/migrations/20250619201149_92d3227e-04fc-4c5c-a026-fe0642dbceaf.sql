
-- First, let's update the tasks table to match what the code expects
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS assigned_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS denied_reason TEXT;

-- Update the status column to match the expected values
ALTER TABLE public.tasks 
ALTER COLUMN status SET DEFAULT 'assigned';

-- Update priority column to match expected values  
ALTER TABLE public.tasks 
ALTER COLUMN priority SET DEFAULT 'medium';

-- Add proper check constraints for status and priority
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_status_check,
ADD CONSTRAINT tasks_status_check CHECK (status IN ('assigned', 'in-progress', 'completed', 'overdue', 'denied'));

ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_priority_check,
ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high'));

-- Ensure the foreign key constraints exist for proper relationships
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_client_id_fkey,
ADD CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_therapist_id_fkey,
ADD CONSTRAINT tasks_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Make due_date required (not nullable)
ALTER TABLE public.tasks 
ALTER COLUMN due_date SET NOT NULL;
