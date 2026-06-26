-- ============================================================================
-- Bondable — Finder marketplace data model (0004_finder.sql)
-- ----------------------------------------------------------------------------
-- Run this on already-provisioned databases that predate the Finder tables.
-- Fresh installs from drizzle/0000_init.sql already include everything below.
--
-- Adds the public-facing therapist/coach Finder marketplace:
--   1. provider_profiles  — one row per provider that opts into the public
--                           Finder. provider_id is BOTH the PK and the FK to
--                           profiles.id (1:1 with a profile). Regulated-
--                           clinician-vs-coach is read from profiles.is_regulated
--                           (NOT duplicated here). hourly_rate is shown for
--                           transparency but is NEVER a ranking/match input —
--                           the Finder ranks purely on FIT (EU P2B +
--                           Belgian dichotomieverbod by design).
--   2. provider_requests  — Finder leads (client → provider contact requests).
--                           client_id is nullable: a brand-new visitor leaves
--                           name/email and client_id stays null until/if they
--                           register as a Bondable user.
--
-- Idempotent: safe to run more than once
--   (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, FKs guarded by a
--    DO-block duplicate_object catch, CREATE INDEX IF NOT EXISTS). Mirrors the
--   "tables + FKs + indexes only" scope of 0000_init.sql — CHECK constraints,
--   RLS and triggers are handled at the API / Postgres-function layer.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. provider_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "provider_profiles" (
  "provider_id"            uuid PRIMARY KEY,
  "headline"               text,
  "bio"                    text,
  "specializations"        jsonb,
  "languages"              jsonb,
  "modalities"             jsonb,
  "approach"               text,
  "hourly_rate"            integer,
  "city"                   text,
  "country"                text DEFAULT 'BE',
  "accepting_new_clients"  boolean NOT NULL DEFAULT true,
  "credentials"            text,
  "years_experience"       integer,
  "photo_url"              text,
  "rating"                 numeric,
  "review_count"           integer,
  "is_published"           boolean NOT NULL DEFAULT true,
  "created_at"             timestamptz NOT NULL DEFAULT now(),
  "updated_at"             timestamptz NOT NULL DEFAULT now()
);

-- Column top-ups for partially-provisioned tables.
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "headline"              text;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "bio"                   text;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "specializations"       jsonb;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "languages"             jsonb;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "modalities"            jsonb;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "approach"              text;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "hourly_rate"           integer;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "city"                  text;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "country"               text DEFAULT 'BE';
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "accepting_new_clients" boolean NOT NULL DEFAULT true;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "credentials"           text;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "years_experience"      integer;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "photo_url"             text;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "rating"                numeric;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "review_count"          integer;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "is_published"          boolean NOT NULL DEFAULT true;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "created_at"            timestamptz NOT NULL DEFAULT now();
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "updated_at"            timestamptz NOT NULL DEFAULT now();

-- ----------------------------------------------------------------------------
-- 2. provider_requests (Finder leads)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "provider_requests" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider_id"         uuid NOT NULL,
  "client_id"           uuid,
  "client_name"         text,
  "client_email"        text,
  "topic"               text,
  "message"             text,
  "preferred_modality"  text,
  "status"              text NOT NULL DEFAULT 'pending',
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "responded_at"        timestamptz
);

-- ----------------------------------------------------------------------------
-- 3. Foreign keys (idempotent — skip if the constraint already exists)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "provider_profiles"
    ADD CONSTRAINT "provider_profiles_provider_id_fkey"
    FOREIGN KEY ("provider_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_requests"
    ADD CONSTRAINT "provider_requests_provider_id_fkey"
    FOREIGN KEY ("provider_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_requests"
    ADD CONSTRAINT "provider_requests_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 4. Lookup indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "idx_provider_profiles_published"
  ON "provider_profiles" ("is_published") WHERE "is_published" = true;
CREATE INDEX IF NOT EXISTS "idx_provider_requests_provider"
  ON "provider_requests" ("provider_id");

-- ============================================================================
-- End of 0004_finder.sql
-- ============================================================================
