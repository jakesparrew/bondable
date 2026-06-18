-- Ensure external_messages emits realtime changes
-- 1) Add to publication supabase_realtime if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'external_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.external_messages';
  END IF;
END $$;

-- 2) Use REPLICA IDENTITY FULL for complete row data on updates/deletes (safe for inserts too)
ALTER TABLE public.external_messages REPLICA IDENTITY FULL;

-- Optional: also ensure conversations are in publication for related UI (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  END IF;
END $$;