-- Performance indexes for frequent queries
-- Messages: unread counts and conversation fetches
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON public.messages (recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON public.messages (conversation_id, created_at DESC);

-- Conversations: participant filters
CREATE INDEX IF NOT EXISTS idx_conversations_therapist_id ON public.conversations (therapist_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations (client_id);

-- Tasks: dashboard/sidebar counts and filters
CREATE INDEX IF NOT EXISTS idx_tasks_therapist_status_due_date ON public.tasks (therapist_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_client_status_due_date ON public.tasks (client_id, status, due_date);

-- Journal entries: common client filters
CREATE INDEX IF NOT EXISTS idx_journal_entries_client_date ON public.journal_entries (client_id, entry_date);
