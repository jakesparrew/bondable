-- Optional performance index for ordering conversations by last_message_at
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations (last_message_at DESC);