-- Force refresh PostgREST schema cache and ensure constraints exist
DO $$
BEGIN
    -- Drop and recreate the constraints to ensure they're properly created
    
    -- Drop if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_client_id_fkey') THEN
        ALTER TABLE public.sessions DROP CONSTRAINT sessions_client_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_therapist_id_fkey') THEN
        ALTER TABLE public.sessions DROP CONSTRAINT sessions_therapist_id_fkey;
    END IF;
    
    -- Create the constraints
    ALTER TABLE public.sessions
        ADD CONSTRAINT sessions_client_id_fkey
        FOREIGN KEY (client_id)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
        
    ALTER TABLE public.sessions
        ADD CONSTRAINT sessions_therapist_id_fkey
        FOREIGN KEY (therapist_id)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
        
    -- Force PostgREST to reload its schema cache
    NOTIFY pgrst, 'reload schema';
END $$;