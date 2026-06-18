-- Attach updated_at triggers and messaging triggers safely

-- Helper: create trigger if not exists
DO $$
BEGIN
  -- tasks updated_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tasks_updated_at'
  ) THEN
    CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_tasks_updated_at();
  END IF;

  -- sessions updated_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_sessions_updated_at();
  END IF;

  -- admin_notification_settings updated_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_admin_notification_settings_updated_at'
  ) THEN
    CREATE TRIGGER trg_admin_notification_settings_updated_at
    BEFORE UPDATE ON public.admin_notification_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_admin_notification_settings_updated_at();
  END IF;

  -- generic updated_at for common tables
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_updated_at') THEN
    CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_journal_entries_updated_at') THEN
    CREATE TRIGGER trg_journal_entries_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notifications_updated_at') THEN
    CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversations_updated_at') THEN
    CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- messages triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_messages_set_sent') THEN
    CREATE TRIGGER trg_messages_set_sent
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_message_status_instantly();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_messages_update_conversation') THEN
    CREATE TRIGGER trg_messages_update_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_messages_updated_at') THEN
    CREATE TRIGGER trg_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;