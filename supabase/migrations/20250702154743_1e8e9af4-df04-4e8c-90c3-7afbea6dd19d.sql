-- Security Enhancement Migration
-- This migration implements comprehensive security fixes for the therapy management application

-- 1. ADD ADMIN ROLE TO USER_ROLE ENUM
-- First, get current enum values and add admin if it doesn't exist
DO $$
BEGIN
    -- Check if admin role already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'admin' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        -- Add admin to the enum
        ALTER TYPE user_role ADD VALUE 'admin';
    END IF;
END$$;

-- 2. CLEAN UP REDUNDANT RLS POLICIES
-- Remove duplicate policies that provide the same access

-- Remove duplicate client_therapist_relationships policies
DROP POLICY IF EXISTS "Therapists can view their client relationships" ON client_therapist_relationships;
DROP POLICY IF EXISTS "Therapists can manage client relationships" ON client_therapist_relationships;
DROP POLICY IF EXISTS "Clients can view their therapist relationships" ON client_therapist_relationships;
DROP POLICY IF EXISTS "Users can view their own relationships" ON client_therapist_relationships;

-- Remove duplicate clients policies
DROP POLICY IF EXISTS "Therapists can view their clients" ON clients;
DROP POLICY IF EXISTS "Therapists can update their clients" ON clients;
DROP POLICY IF EXISTS "Therapists can delete their clients" ON clients;
DROP POLICY IF EXISTS "Therapists can insert clients" ON clients;

-- Remove duplicate sessions policies
DROP POLICY IF EXISTS "Therapists can view sessions for their clients" ON sessions;
DROP POLICY IF EXISTS "Therapists can update sessions for their clients" ON sessions;
DROP POLICY IF EXISTS "Therapists can delete sessions for their clients" ON sessions;
DROP POLICY IF EXISTS "Therapists can insert sessions for their clients" ON sessions;

-- Remove duplicate tasks policies
DROP POLICY IF EXISTS "Therapists can view tasks for their clients" ON tasks;
DROP POLICY IF EXISTS "Therapists can update tasks for their clients" ON tasks;
DROP POLICY IF EXISTS "Therapists can delete tasks for their clients" ON tasks;
DROP POLICY IF EXISTS "Therapists can insert tasks for their clients" ON tasks;
DROP POLICY IF EXISTS "Therapists can delete their tasks" ON tasks;
DROP POLICY IF EXISTS "Therapists can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Clients can view their assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Clients can update task status" ON tasks;

-- 3. CREATE ROLE-BASED ACCESS FUNCTION
-- This function checks if a user has a specific role, preventing RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- 4. CREATE IMPROVED RLS POLICIES

-- Client_therapist_relationships - consolidated policies
CREATE POLICY "Users can manage their own relationships" 
ON client_therapist_relationships 
FOR ALL 
USING ((auth.uid() = therapist_id) OR (auth.uid() = client_id))
WITH CHECK ((auth.uid() = therapist_id) OR (auth.uid() = client_id));

-- Clients - consolidated policies for therapists
CREATE POLICY "Therapists can manage their own clients" 
ON clients 
FOR ALL 
USING (therapist_id = auth.uid() AND get_user_role() = 'therapist')
WITH CHECK (therapist_id = auth.uid() AND get_user_role() = 'therapist');

-- Sessions - consolidated policies
CREATE POLICY "Users can manage their own sessions" 
ON sessions 
FOR ALL 
USING (
  (therapist_id = auth.uid() AND get_user_role() = 'therapist') OR 
  (client_id = auth.uid() AND get_user_role() = 'client')
)
WITH CHECK (
  (therapist_id = auth.uid() AND get_user_role() = 'therapist') OR 
  (client_id = auth.uid() AND get_user_role() = 'client')
);

-- Tasks - consolidated policies
CREATE POLICY "Users can manage their own tasks" 
ON tasks 
FOR ALL 
USING (
  (therapist_id = auth.uid() AND get_user_role() = 'therapist') OR 
  (client_id = auth.uid() AND get_user_role() = 'client')
)
WITH CHECK (
  (therapist_id = auth.uid() AND get_user_role() = 'therapist') OR 
  (client_id = auth.uid() AND get_user_role() = 'client')
);

-- 5. ADD ADMIN ACCESS POLICIES
-- Admin users can view all data for management purposes

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON profiles 
FOR SELECT 
USING (get_user_role() = 'admin');

-- Admin can view all client relationships
CREATE POLICY "Admins can view all relationships" 
ON client_therapist_relationships 
FOR SELECT 
USING (get_user_role() = 'admin');

-- Admin can view all clients
CREATE POLICY "Admins can view all clients" 
ON clients 
FOR SELECT 
USING (get_user_role() = 'admin');

-- Admin can view all sessions (but not modify)
CREATE POLICY "Admins can view all sessions" 
ON sessions 
FOR SELECT 
USING (get_user_role() = 'admin');

-- Admin can view all tasks (but not modify)
CREATE POLICY "Admins can view all tasks" 
ON tasks 
FOR SELECT 
USING (get_user_role() = 'admin');

-- 6. SECURE STORAGE POLICIES
-- Make journal-attachments bucket private and add proper access controls

-- First, let's make the journal-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'journal-attachments';

-- Add storage policies for journal-attachments (now private)
CREATE POLICY "Users can view their own journal attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'journal-attachments' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Allow therapists to view attachments from their clients' journals that are shared
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.attachments ? name
      AND (
        (je.sharing_type = 'all' AND EXISTS (
          SELECT 1 FROM client_therapist_relationships ctr 
          WHERE ctr.client_id = je.client_id 
          AND ctr.therapist_id = auth.uid() 
          AND ctr.status = 'active'
        )) OR
        (je.sharing_type = 'specific' AND je.shared_with_therapists ? auth.uid()::text)
      )
    )
  )
);

CREATE POLICY "Users can upload their own journal attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'journal-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own journal attachments" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'journal-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own journal attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'journal-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 7. ADD AUDIT LOGGING TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON audit_logs 
FOR SELECT 
USING (get_user_role() = 'admin');

-- 8. CREATE AUDIT LOG TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log operations by authenticated users
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, OLD.id::text),
      CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 9. ADD AUDIT TRIGGERS TO SENSITIVE TABLES
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

-- 10. CREATE SECURE ADMIN USER MANAGEMENT FUNCTIONS
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