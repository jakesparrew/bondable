-- Fix missing profiles for users who registered but profiles weren't created

-- Get user details first
DO $$
DECLARE
    maria_user_id UUID := '15e4d55b-350f-4838-8bca-f89b1303ad73';
    boppenla_user_id UUID := '9ff7b958-1820-4832-8800-22c5c4ce6dac';
    thomas_user_id UUID := '65522c51-3175-4a99-9c9b-05dbbc8b83ac';
BEGIN
    -- Create profile for mariacharlotte680@gmail.com
    INSERT INTO public.profiles (id, role, email, first_name, last_name)
    VALUES (
        maria_user_id,
        'client'::user_role,
        'mariacharlotte680@gmail.com',
        'Maria',
        'Charlotte'
    );
    
    -- Create profile for boppenla@gmail.com  
    INSERT INTO public.profiles (id, role, email, first_name, last_name)
    VALUES (
        boppenla_user_id,
        'client'::user_role,
        'boppenla@gmail.com',
        'Boppenla',
        ''
    );
    
    -- Create profile for thomasheersmink1@gmail.com
    INSERT INTO public.profiles (id, role, email, first_name, last_name)
    VALUES (
        thomas_user_id,
        'client'::user_role,
        'thomasheersmink1@gmail.com',
        'Thomas',
        'Heersmink'
    );
    
    RAISE LOG 'Created missing profiles for all 3 users';
    
    -- For Thomas, create the client-therapist relationship since he was invited
    INSERT INTO public.client_therapist_relationships (client_id, therapist_id, status)
    VALUES (
        thomas_user_id,
        'af31c012-29d0-4149-ab14-41e4f6ce38f9', -- His therapist from the clients table
        'active'
    );
    
    -- Clean up the pending client record for Thomas since he now has a proper profile
    DELETE FROM public.clients WHERE email = 'thomasheersmink1@gmail.com';
    
    RAISE LOG 'Fixed Thomas client-therapist relationship and cleaned up pending client record';
    
END $$;