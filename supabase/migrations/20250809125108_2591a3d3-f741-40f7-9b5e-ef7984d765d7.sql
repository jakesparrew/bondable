-- Create table to persist Google Calendar connection state and refresh tokens
CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  user_id uuid PRIMARY KEY,
  connected boolean NOT NULL DEFAULT false,
  refresh_token text,
  scope text,
  last_synced_start date,
  last_synced_end date,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_google_calendar_connections_user
    FOREIGN KEY (user_id)
    REFERENCES public.profiles (id)
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage only their own row
CREATE POLICY "Users can select their own google calendar connection"
ON public.google_calendar_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own google calendar connection"
ON public.google_calendar_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own google calendar connection"
ON public.google_calendar_connections
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own google calendar connection"
ON public.google_calendar_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Update updated_at on change
CREATE TRIGGER update_google_calendar_connections_updated_at
BEFORE UPDATE ON public.google_calendar_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
