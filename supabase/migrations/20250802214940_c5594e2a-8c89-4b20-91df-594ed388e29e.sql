-- Fix final database functions with security vulnerabilities

-- Fix create_admin_user function
CREATE OR REPLACE FUNCTION public.create_admin_user(user_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    -- Only allow existing admins to create new admins
    IF get_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Access denied: Only admins can create admin users';
    END IF;
    
    -- Check if user exists in profiles
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = user_email) THEN
        RAISE EXCEPTION 'User with email % does not exist', user_email;
    END IF;
    
    -- Update user role to admin
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE email = user_email;
    
    -- Add to admin_users table
    INSERT INTO public.admin_users (user_email, granted_by)
    VALUES (user_email, (SELECT email FROM auth.users WHERE id = auth.uid()))
    ON CONFLICT (user_email) DO NOTHING;
    
    RETURN 'Admin access granted to ' || user_email;
END;
$function$;

-- Fix remove_admin_user function
CREATE OR REPLACE FUNCTION public.remove_admin_user(user_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    -- Only allow existing admins to remove admin users
    IF get_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Access denied: Only admins can remove admin users';
    END IF;
    
    -- Update user role back to client (default)
    UPDATE public.profiles 
    SET role = 'client' 
    WHERE email = user_email;
    
    -- Remove from admin_users table
    DELETE FROM public.admin_users WHERE user_email = user_email;
    
    RETURN 'Admin access revoked from ' || user_email;
END;
$function$;