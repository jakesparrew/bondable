
-- First, drop any existing problematic policies
DROP POLICY IF EXISTS "Admin users can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin access policy" ON public.admin_users;
DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admin_users;

-- Create a security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user email exists in admin_users table
  -- Using security definer bypasses RLS policies
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a function to get current user email safely
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows users to check their own admin status
CREATE POLICY "Users can check their own admin status" ON public.admin_users
FOR SELECT USING (
  user_email = public.get_current_user_email()
);

-- Allow admins to view all admin users (for admin management)
CREATE POLICY "Admins can view all admin users" ON public.admin_users
FOR SELECT USING (public.is_admin_user());

-- Allow system to insert admin users (for granting admin access)
CREATE POLICY "System can insert admin users" ON public.admin_users
FOR INSERT WITH CHECK (true);
