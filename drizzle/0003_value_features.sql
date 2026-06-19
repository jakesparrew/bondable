-- ============================================================================
-- Bondable — value features data model (0003_value_features.sql)
-- ----------------------------------------------------------------------------
-- Run this on already-provisioned databases that predate the value-feature
-- tables/columns. Fresh installs from drizzle/0000_init.sql already include
-- everything below.
--
-- Adds:
--   1. sessions.recap            — therapist-authored session summary, visible
--                                  to both client and therapist.
--   2. session_feedback          — post-session working-alliance micro-check
--                                  (1–5 rating + optional note) left by clients.
--   3. client_checkins           — between-session "I'm not okay this week"
--                                  flag from a client to their therapist, with
--                                  an acknowledgement timestamp.
--
-- Idempotent: safe to run more than once
--   (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS, FKs guarded by a
--    DO-block duplicate_object catch). Mirrors the "tables + FKs only" scope of
--   0000_init.sql — CHECK constraints, RLS, triggers are handled elsewhere.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. sessions.recap
-- ----------------------------------------------------------------------------
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "recap" text;

-- ----------------------------------------------------------------------------
-- 2. session_feedback (post-session alliance micro-check)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "session_feedback" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id"       uuid NOT NULL,
  "client_id"        uuid NOT NULL,
  "alliance_rating"  integer,
  "note"             text,
  "created_at"       timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. client_checkins (between-session distress / check-in flag)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "client_checkins" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id"        uuid NOT NULL,
  "therapist_id"     uuid NOT NULL,
  "kind"             text NOT NULL,
  "note"             text,
  "acknowledged_at"  timestamptz,
  "created_at"       timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. Foreign keys (idempotent — skip if the constraint already exists)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "session_feedback"
    ADD CONSTRAINT "session_feedback_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "session_feedback"
    ADD CONSTRAINT "session_feedback_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "client_checkins"
    ADD CONSTRAINT "client_checkins_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "client_checkins"
    ADD CONSTRAINT "client_checkins_therapist_id_fkey"
    FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- End of 0003_value_features.sql
-- ============================================================================
