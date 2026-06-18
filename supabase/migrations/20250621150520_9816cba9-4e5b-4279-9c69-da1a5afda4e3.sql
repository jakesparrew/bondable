
-- Fix the foreign key constraint for tasks.client_id to reference profiles instead of clients
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_client_id_fkey;

ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also ensure the therapist_id constraint points to profiles (it should already, but let's be sure)
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_therapist_id_fkey;

ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_therapist_id_fkey 
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
