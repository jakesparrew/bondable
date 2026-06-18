
-- Add additional columns to the profiles table for complete profile data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS age TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS weekly_availability JSONB;
