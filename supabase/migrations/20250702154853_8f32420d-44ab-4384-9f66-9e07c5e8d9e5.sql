-- Security Enhancement Migration Part 4
-- Add admin access policies

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