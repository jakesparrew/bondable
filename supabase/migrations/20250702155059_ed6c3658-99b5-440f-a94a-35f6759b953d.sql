-- Security Enhancement Migration Part 7
-- Add audit triggers and admin management functions

-- ADD AUDIT TRIGGERS TO SENSITIVE TABLES
DROP TRIGGER IF EXISTS audit_clients ON clients;
CREATE TRIGGER audit_clients 
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_sessions ON sessions;
CREATE TRIGGER audit_sessions 
  AFTER INSERT OR UPDATE OR DELETE ON sessions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_journal_entries ON journal_entries;
CREATE TRIGGER audit_journal_entries 
  AFTER INSERT OR UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_admin_users ON admin_users;
CREATE TRIGGER audit_admin_users 
  AFTER INSERT OR UPDATE OR DELETE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- CREATE SECURE ADMIN USER MANAGEMENT FUNCTIONS
CREATE OR REPLACE FUNCTION public.create_admin_user(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.remove_admin_user(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;