-- Add relationships so PostgREST can join sessions <-> profiles
BEGIN;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_id ON public.sessions(therapist_id);

-- FK: sessions.client_id -> profiles.id (named to match code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_client_id_fkey'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES public.profiles(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

-- FK: sessions.therapist_id -> profiles.id (named to match code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_therapist_id_fkey'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_therapist_id_fkey
      FOREIGN KEY (therapist_id)
      REFERENCES public.profiles(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

COMMIT;