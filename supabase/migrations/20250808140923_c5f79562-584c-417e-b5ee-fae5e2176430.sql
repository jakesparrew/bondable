-- Pin search_path for test_trigger_function to satisfy linter
CREATE OR REPLACE FUNCTION public.test_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    RAISE NOTICE 'Trigger fired for message: %', NEW.id;
    RETURN NEW;
END;
$function$;