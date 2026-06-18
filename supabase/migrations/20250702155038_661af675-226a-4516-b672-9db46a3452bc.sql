-- Security Enhancement Migration Part 6
-- Add audit logging

-- ADD AUDIT LOGGING TABLE
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

-- CREATE AUDIT LOG TRIGGER FUNCTION
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