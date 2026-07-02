-- 0006_onboarding.sql — onboarding progress + announcements (Phase 2 / R13).
-- Additive; safe to re-run.

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         text NOT NULL,            -- provider | client
  steps        jsonb,                    -- { [stepKey]: boolean }
  activated_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  body_md      text,
  audience     jsonb,                    -- { roles: [], tiers: [] }
  style        text,                     -- info | feature | maintenance
  starts_at    timestamptz,
  ends_at      timestamptz,
  published_at timestamptz,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now()
);
