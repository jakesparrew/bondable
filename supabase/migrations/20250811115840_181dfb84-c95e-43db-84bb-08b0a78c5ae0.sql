-- Fix type mismatch in create_notification (related_id is uuid)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_id uuid DEFAULT NULL,
  p_related_type text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type, is_read, created_at, updated_at)
  VALUES (
    p_user_id,
    COALESCE(p_type, 'general'),
    LEFT(p_title, 120),
    LEFT(p_message, 300),
    p_related_id,
    p_related_type,
    false,
    now(),
    now()
  );
END;
$$;