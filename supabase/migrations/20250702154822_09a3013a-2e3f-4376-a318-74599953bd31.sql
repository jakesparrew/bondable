-- Security Enhancement Migration Part 2
-- Clean up redundant RLS policies and create improved ones

-- 1. CLEAN UP REDUNDANT RLS POLICIES
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

-- 2. CREATE ROLE-BASED ACCESS FUNCTION
-- This function checks if a user has a specific role, preventing RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;