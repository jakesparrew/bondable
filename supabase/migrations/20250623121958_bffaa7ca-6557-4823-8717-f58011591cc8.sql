
-- Add RLS policies to allow therapists to view connected clients' profiles
CREATE POLICY "Therapists can view connected clients profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.client_therapist_relationships 
      WHERE client_id = profiles.id 
      AND therapist_id = auth.uid() 
      AND status = 'active'
    )
  );

-- Add RLS policies to allow clients to view connected therapists' profiles  
CREATE POLICY "Clients can view connected therapists profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.client_therapist_relationships 
      WHERE therapist_id = profiles.id 
      AND client_id = auth.uid() 
      AND status = 'active'
    )
  );
