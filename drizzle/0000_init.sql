-- ============================================================================
-- Bondable — initial database schema (Neon / PostgreSQL)
-- ============================================================================
-- Builds the full Bondable physical schema (25 tables + 1 enum) on a fresh,
-- empty Neon `neondb` database. Paste-and-run from the Neon web SQL editor,
-- top to bottom — no CLI, no npm required.
--
-- Generated from src/server/db/schema.ts (Drizzle pg-core). Column names are
-- snake_case, mirroring the original Supabase schema.
--
-- SCOPE: tables, enums, and foreign keys ONLY. Row-Level Security (RLS),
-- policies, CHECK constraints, triggers, sequences-driven logic, and RPC /
-- SECURITY DEFINER functions are intentionally NOT included here — auth and
-- those server-side rules are handled separately (API layer / Neon RLS layer).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 2. Enum types
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('therapist', 'client', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 3. Tables (no inline foreign keys)
-- ----------------------------------------------------------------------------

-- profiles -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "profiles" (
  "id"                              uuid PRIMARY KEY,
  "address"                         text,
  "age"                             text,
  "avatar_url"                      text,
  "created_at"                      timestamptz DEFAULT now(),
  "date_of_birth"                   date,
  "email"                           text,
  "emergency_contact_name"          text,
  "emergency_contact_phone"         text,
  "emergency_contact_relationship"  text,
  "first_name"                      text,
  "invite_code"                     text,
  "last_name"                       text,
  "phone"                           text,
  "role"                            "user_role" NOT NULL DEFAULT 'client',
  "is_regulated"                    boolean NOT NULL DEFAULT false,
  "updated_at"                      timestamptz DEFAULT now(),
  "weekly_availability"             jsonb
);

-- client_therapist_relationships --------------------------------------------
CREATE TABLE IF NOT EXISTS "client_therapist_relationships" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"     uuid NOT NULL,
  "therapist_id"  uuid NOT NULL,
  "status"        text NOT NULL DEFAULT 'active',
  "connected_at"  timestamptz NOT NULL DEFAULT now(),
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);

-- clients --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "clients" (
  "id"                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "avatar_url"                      text,
  "created_at"                      timestamptz DEFAULT now(),
  "email"                           text NOT NULL,
  "emergency_contact_name"          text,
  "emergency_contact_phone"         text,
  "emergency_contact_relationship"  text,
  "first_name"                      text NOT NULL,
  "join_date"                       date,
  "last_name"                       text NOT NULL,
  "last_session"                    date,
  "next_session"                    date,
  "notes"                           text,
  "phone"                           text,
  "status"                          text,
  "therapist_id"                    uuid NOT NULL,
  "updated_at"                      timestamptz DEFAULT now()
);

-- conversations --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "conversations" (
  "id"                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"                uuid NOT NULL,
  "therapist_id"             uuid NOT NULL,
  "last_message_at"          timestamptz,
  "last_message_preview"     text,
  "unread_count_client"      integer DEFAULT 0,
  "unread_count_therapist"   integer DEFAULT 0,
  "created_at"               timestamptz NOT NULL DEFAULT now(),
  "updated_at"               timestamptz NOT NULL DEFAULT now()
);

-- messages -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "messages" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id"  uuid NOT NULL,
  "sender_id"        uuid NOT NULL,
  "recipient_id"     uuid NOT NULL,
  "content"          text NOT NULL,
  "message_type"     text NOT NULL DEFAULT 'text',
  "sequence_number"  bigserial NOT NULL,
  "status"           text NOT NULL DEFAULT 'sent',
  "read_at"          timestamptz,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

-- message_attachments --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "message_attachments" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id"        uuid NOT NULL,
  "file_name"         text NOT NULL,
  "file_size"         bigint NOT NULL,
  "file_type"         text NOT NULL,
  "file_url"          text NOT NULL,
  "mime_type"         text NOT NULL,
  "duration_seconds"  numeric,
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  "updated_at"        timestamptz NOT NULL DEFAULT now()
);

-- external_messages ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "external_messages" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id"  uuid NOT NULL,
  "channel"          text NOT NULL,
  "content"          text NOT NULL,
  "direction"        text NOT NULL,
  "from_number"      text,
  "to_number"        text,
  "provider_sid"     text,
  "status"           text NOT NULL DEFAULT 'queued',
  "error"            jsonb,
  "sent_at"          timestamptz,
  "delivered_at"     timestamptz,
  "read_at"          timestamptz,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

-- google_calendar_connections ------------------------------------------------
CREATE TABLE IF NOT EXISTS "google_calendar_connections" (
  "user_id"            uuid PRIMARY KEY,
  "connected"          boolean NOT NULL DEFAULT false,
  "refresh_token"      text,
  "scope"              text,
  "last_synced_at"     timestamptz,
  "last_synced_start"  timestamptz,
  "last_synced_end"    timestamptz,
  "created_at"         timestamptz NOT NULL DEFAULT now(),
  "updated_at"         timestamptz NOT NULL DEFAULT now()
);

-- journal_entries ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id"                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"                 uuid NOT NULL,
  "title"                     text NOT NULL,
  "content"                   text NOT NULL,
  "mood"                      text,
  "entry_date"                date,
  "is_shared_with_therapist"  boolean DEFAULT false,
  "shared_with_therapists"    jsonb DEFAULT '[]'::jsonb,
  "sharing_type"              text,
  "attachments"               jsonb,
  "created_at"                timestamptz DEFAULT now(),
  "updated_at"                timestamptz DEFAULT now()
);

-- local_documents ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "local_documents" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid NOT NULL,
  "file_name"   text NOT NULL,
  "file_size"   bigint NOT NULL,
  "file_type"   text NOT NULL,
  "file_url"    text NOT NULL,
  "mime_type"   text NOT NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

-- notifications --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       uuid NOT NULL,
  "type"          text NOT NULL DEFAULT 'info',
  "title"         text NOT NULL,
  "message"       text NOT NULL,
  "related_id"    uuid,
  "related_type"  text,
  "is_read"       boolean NOT NULL DEFAULT false,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);

-- sessions -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "sessions" (
  "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"                   uuid NOT NULL,
  "therapist_id"                uuid NOT NULL,
  "session_date"                date NOT NULL,
  "session_time"                time NOT NULL,
  "session_type"                text NOT NULL,
  "session_format"              text,
  "therapy_type"                text,
  "duration_minutes"            integer NOT NULL DEFAULT 60,
  "location"                    text,
  "notes"                       text,
  "recap"                       text,
  "status"                      text NOT NULL DEFAULT 'scheduled',
  "waiting_for_response_from"   uuid,
  "created_at"                  timestamptz NOT NULL DEFAULT now(),
  "updated_at"                  timestamptz NOT NULL DEFAULT now()
);

-- tasks ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tasks" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"      uuid NOT NULL,
  "therapist_id"   uuid NOT NULL,
  "title"          text NOT NULL,
  "description"    text,
  "notes"          text,
  "priority"       text,
  "status"         text NOT NULL DEFAULT 'pending',
  "assigned_date"  timestamptz NOT NULL DEFAULT now(),
  "due_date"       timestamptz,
  "denied_reason"  text,
  "created_at"     timestamptz DEFAULT now(),
  "updated_at"     timestamptz DEFAULT now()
);

-- session_feedback -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "session_feedback" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id"       uuid NOT NULL,
  "client_id"        uuid NOT NULL,
  "alliance_rating"  integer,
  "note"             text,
  "created_at"       timestamptz DEFAULT now()
);

-- client_checkins ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "client_checkins" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"        uuid NOT NULL,
  "therapist_id"     uuid NOT NULL,
  "kind"             text NOT NULL,
  "note"             text,
  "acknowledged_at"  timestamptz,
  "created_at"       timestamptz DEFAULT now()
);

-- messaging_sessions ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "messaging_sessions" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          uuid,
  "actor_role"       text NOT NULL,
  "channel"          text NOT NULL,
  "phone_digits"     text NOT NULL,
  "state"            text NOT NULL DEFAULT 'idle',
  "selected_id"      text,
  "options"          jsonb,
  "expire_at"        timestamptz,
  "last_message_at"  timestamptz NOT NULL DEFAULT now(),
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

-- user_devices ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "user_devices" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        uuid NOT NULL,
  "token"          text NOT NULL,
  "platform"       text NOT NULL,
  "push_provider"  text NOT NULL DEFAULT 'fcm',
  "device_info"    jsonb,
  "is_active"      boolean NOT NULL DEFAULT true,
  "last_seen_at"   timestamptz,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now()
);

-- questionnaire_templates ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "questionnaire_templates" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "therapist_id"  uuid NOT NULL,
  "title"         text NOT NULL,
  "description"   text,
  "category"      text,
  "is_published"  boolean NOT NULL DEFAULT false,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);

-- questionnaire_questions ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "questionnaire_questions" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id"    uuid NOT NULL,
  "question_text"  text NOT NULL,
  "help_text"      text,
  "question_type"  text NOT NULL,
  "options"        jsonb,
  "is_required"    boolean NOT NULL DEFAULT false,
  "position"       integer NOT NULL DEFAULT 0,
  "config"         jsonb,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now()
);

-- client_questionnaires ------------------------------------------------------
CREATE TABLE IF NOT EXISTS "client_questionnaires" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"             uuid NOT NULL,
  "therapist_id"          uuid NOT NULL,
  "template_id"           uuid,
  "title_snapshot"        text NOT NULL,
  "description_snapshot"  text,
  "questions_snapshot"    jsonb NOT NULL,
  "status"                text NOT NULL DEFAULT 'not_started',
  "assigned_at"           timestamptz NOT NULL DEFAULT now(),
  "started_at"            timestamptz,
  "completed_at"          timestamptz,
  "created_at"            timestamptz NOT NULL DEFAULT now(),
  "updated_at"            timestamptz NOT NULL DEFAULT now()
);

-- questionnaire_responses ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "questionnaire_responses" (
  "id"                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_questionnaire_id"   uuid NOT NULL,
  "question_id"               text NOT NULL,
  "answer"                    jsonb NOT NULL,
  "updated_at"                timestamptz NOT NULL DEFAULT now()
);

-- admin_users ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin_users" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "granted_at"  timestamptz NOT NULL DEFAULT now(),
  "granted_by"  uuid,
  "user_email"  text NOT NULL
);

-- admin_notification_settings ------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin_notification_settings" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "email_addresses"     jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_enabled"          boolean NOT NULL DEFAULT true,
  "notification_type"   text NOT NULL,
  "updated_at"          timestamptz NOT NULL DEFAULT now()
);

-- ai_settings ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_settings" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "setting_name"   text NOT NULL,
  "setting_value"  jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at"     timestamptz NOT NULL DEFAULT now()
);

-- audit_logs -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "action"      text NOT NULL,
  "created_at"  timestamptz DEFAULT now(),
  "new_values"  jsonb,
  "old_values"  jsonb,
  "record_id"   uuid,
  "table_name"  text,
  "user_id"     uuid
);

-- ----------------------------------------------------------------------------
-- 4. Foreign keys (added after all tables exist)
-- ----------------------------------------------------------------------------

ALTER TABLE "client_therapist_relationships"
  ADD CONSTRAINT "client_therapist_relationships_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
ALTER TABLE "client_therapist_relationships"
  ADD CONSTRAINT "client_therapist_relationships_therapist_id_fkey"
  FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_therapist_id_fkey"
  FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_recipient_id_fkey"
  FOREIGN KEY ("recipient_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "message_attachments"
  ADD CONSTRAINT "message_attachments_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE;

ALTER TABLE "external_messages"
  ADD CONSTRAINT "external_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;

ALTER TABLE "google_calendar_connections"
  ADD CONSTRAINT "google_calendar_connections_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "journal_entries"
  ADD CONSTRAINT "journal_entries_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "local_documents"
  ADD CONSTRAINT "local_documents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_therapist_id_fkey"
  FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_therapist_id_fkey"
  FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "questionnaire_templates"
  ADD CONSTRAINT "questionnaire_templates_therapist_id_fkey"
  FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "questionnaire_questions"
  ADD CONSTRAINT "questionnaire_questions_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "questionnaire_templates"("id") ON DELETE CASCADE;

ALTER TABLE "client_questionnaires"
  ADD CONSTRAINT "client_questionnaires_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
ALTER TABLE "client_questionnaires"
  ADD CONSTRAINT "client_questionnaires_therapist_id_fkey"
  FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
ALTER TABLE "client_questionnaires"
  ADD CONSTRAINT "client_questionnaires_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "questionnaire_templates"("id") ON DELETE SET NULL;

ALTER TABLE "questionnaire_responses"
  ADD CONSTRAINT "questionnaire_responses_client_questionnaire_id_fkey"
  FOREIGN KEY ("client_questionnaire_id") REFERENCES "client_questionnaires"("id") ON DELETE CASCADE;

ALTER TABLE "session_feedback"
  ADD CONSTRAINT "session_feedback_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE;
ALTER TABLE "session_feedback"
  ADD CONSTRAINT "session_feedback_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "client_checkins"
  ADD CONSTRAINT "client_checkins_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
ALTER TABLE "client_checkins"
  ADD CONSTRAINT "client_checkins_therapist_id_fkey"
  FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 5. Unique indexes (carried over from schema.ts table-level constraints)
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "client_therapist_relationships_client_id_therapist_id_key"
  ON "client_therapist_relationships" ("client_id", "therapist_id");
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_client_id_therapist_id_key"
  ON "conversations" ("client_id", "therapist_id");
CREATE UNIQUE INDEX IF NOT EXISTS "messaging_sessions_channel_phone_digits_key"
  ON "messaging_sessions" ("channel", "phone_digits");
CREATE UNIQUE INDEX IF NOT EXISTS "user_devices_token_key"
  ON "user_devices" ("token");
CREATE UNIQUE INDEX IF NOT EXISTS "questionnaire_responses_client_questionnaire_id_question_id_key"
  ON "questionnaire_responses" ("client_questionnaire_id", "question_id");
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_user_email_key"
  ON "admin_users" ("user_email");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_settings_setting_name_key"
  ON "ai_settings" ("setting_name");

-- Non-unique / partial lookup indexes
CREATE INDEX IF NOT EXISTS "idx_profiles_invite_code"
  ON "profiles" ("invite_code") WHERE "invite_code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread"
  ON "notifications" ("user_id") WHERE "is_read" = false;

-- ============================================================================
-- End of 0000_init.sql — Bondable schema build complete.
-- ============================================================================
