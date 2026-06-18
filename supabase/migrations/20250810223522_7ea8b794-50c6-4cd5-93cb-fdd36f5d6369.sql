-- Create table for messaging sessions to manage multi-relationship routing via SMS/WhatsApp
CREATE TABLE IF NOT EXISTS public.messaging_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('sms','whatsapp')),
  phone_digits TEXT NOT NULL,
  user_id UUID,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('client','therapist')),
  selected_id UUID,
  state TEXT NOT NULL DEFAULT 'selecting' CHECK (state IN ('selecting','active')),
  options JSONB,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expire_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel, phone_digits)
);

-- Enable RLS
ALTER TABLE public.messaging_sessions ENABLE ROW LEVEL SECURITY;

-- Conservative policies (service role bypasses RLS). No direct client access.
DROP POLICY IF EXISTS "No direct access to messaging_sessions" ON public.messaging_sessions;
CREATE POLICY "No direct access to messaging_sessions"
ON public.messaging_sessions
FOR ALL
USING (false)
WITH CHECK (false);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS update_messaging_sessions_updated_at ON public.messaging_sessions;
CREATE TRIGGER update_messaging_sessions_updated_at
BEFORE UPDATE ON public.messaging_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();