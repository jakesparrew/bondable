-- Update the profile names to be more accurate based on user metadata
UPDATE public.profiles 
SET first_name = 'Brian', last_name = ''
WHERE id = (SELECT id FROM auth.users WHERE email = 'boppenla@gmail.com');

UPDATE public.profiles 
SET first_name = 'Charlotte', last_name = 'Maria'
WHERE id = (SELECT id FROM auth.users WHERE email = 'mariacharlotte680@gmail.com');