-- Fix the profile assignment mistakes
DO $$
DECLARE
    maria_user_id UUID;
    boppenla_user_id UUID;
    thomas_user_id UUID;
BEGIN
    -- Get the correct user IDs
    SELECT id INTO thomas_user_id FROM auth.users WHERE email = 'thomasheersmink1@gmail.com';
    SELECT id INTO maria_user_id FROM auth.users WHERE email = 'mariacharlotte680@gmail.com';
    SELECT id INTO boppenla_user_id FROM auth.users WHERE email = 'boppenla@gmail.com';
    
    -- Delete the incorrect profiles
    DELETE FROM public.profiles WHERE id IN (thomas_user_id, maria_user_id, boppenla_user_id);
    
    -- Create correct profiles
    INSERT INTO public.profiles (id, role, email, first_name, last_name) VALUES
    (maria_user_id, 'client'::user_role, 'mariacharlotte680@gmail.com', 'Maria', 'Charlotte'),
    (boppenla_user_id, 'client'::user_role, 'boppenla@gmail.com', 'Boppenla', ''),
    (thomas_user_id, 'client'::user_role, 'thomasheersmink1@gmail.com', 'Thomas', 'Heersmink');
    
    -- For Thomas, create the client-therapist relationship since he was invited
    INSERT INTO public.client_therapist_relationships (client_id, therapist_id, status)
    VALUES (
        thomas_user_id,
        'af31c012-29d0-4149-ab14-41e4f6ce38f9', -- His therapist from the clients table
        'active'
    );
    
    RAISE LOG 'Fixed profile assignments and created Thomas relationship';
    
END $$;