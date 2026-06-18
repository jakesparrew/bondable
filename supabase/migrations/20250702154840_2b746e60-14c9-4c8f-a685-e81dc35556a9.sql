-- Security Enhancement Migration Part 3
-- Create consolidated and improved RLS policies

-- 1. CREATE IMPROVED RLS POLICIES

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