
-- Add foreign key constraints to link client_therapist_relationships with profiles
ALTER TABLE public.client_therapist_relationships 
ADD CONSTRAINT client_therapist_relationships_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.client_therapist_relationships 
ADD CONSTRAINT client_therapist_relationships_therapist_id_fkey 
FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
