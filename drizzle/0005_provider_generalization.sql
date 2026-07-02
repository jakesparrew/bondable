-- 0005_provider_generalization.sql
-- Additive: provider taxonomy, credential verification, and group practices.
-- Safe to run against an existing DB (guards for re-run). Reversal notes at end.
-- See docs/plan/02-provider-generalization.md and src/lib/providerTypes.ts.

-- 1) Enums --------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE provider_type AS ENUM (
    'clinical_psychologist','clinical_orthopedagogue','psychotherapist',
    'coach','counselor','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('unverified','pending','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE practice_role AS ENUM ('owner','manager','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE credential_kind AS ENUM (
    'visum','erkenningsnummer','base_profession','psychotherapy_training',
    'diploma','certificate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Group practices ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS practices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text NOT NULL,
  city         text,
  country      text DEFAULT 'BE',
  bio          text,
  photo_url    text,
  seat_limit   integer NOT NULL DEFAULT 3,
  is_published boolean NOT NULL DEFAULT false,
  created_by   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practice_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         practice_role NOT NULL DEFAULT 'staff',
  status       text NOT NULL DEFAULT 'active',
  joined_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS practice_members_practice_profile_uidx
  ON practice_members (practice_id, profile_id);

CREATE TABLE IF NOT EXISTS practice_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         practice_role NOT NULL DEFAULT 'staff',
  token        text NOT NULL,
  invited_by   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at   timestamptz,
  accepted_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3) Credentials (verification evidence; reviewed in the owner cockpit) --------
CREATE TABLE IF NOT EXISTS provider_credentials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind         credential_kind NOT NULL,
  reference    text,
  issuer       text,
  file_url     text,
  status       verification_status NOT NULL DEFAULT 'pending',
  reviewed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  review_note  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 4) provider_profiles: typed profession + verification + practice membership --
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS provider_type       provider_type       NOT NULL DEFAULT 'coach',
  ADD COLUMN IF NOT EXISTS verification_status verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS practice_id         uuid REFERENCES practices(id) ON DELETE SET NULL;

-- 5) provider_requests: practice routing + assignment -------------------------
ALTER TABLE provider_requests
  ADD COLUMN IF NOT EXISTS practice_id uuid REFERENCES practices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- NOTE: profiles.is_regulated is now a DERIVED value, written only by the
-- service layer (recomputeRegulated = regulated type AND verified). No trigger
-- here on purpose; the API layer owns the invariant. Backfill existing rows:
--   UPDATE provider_profiles SET provider_type='clinical_psychologist',
--     verification_status='verified' WHERE ...   (per real data)

-- Reversal (manual): DROP TABLE provider_credentials, practice_invites,
-- practice_members, practices; ALTER TABLE ... DROP COLUMN ...; DROP TYPE ...;
