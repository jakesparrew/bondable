-- ============================================================================
-- Bondable — provider location (0008_provider_location.sql)
-- ----------------------------------------------------------------------------
-- Additive: a practice ADDRESS on provider_profiles, with an explicit
-- visibility switch. For in-person care the actual address is a real decision
-- factor (reachability, parking, tram), but many providers work from home and
-- must NEVER be forced to publish where they live.
--
-- address_visibility is the privacy contract:
--   'city_only' (DEFAULT) — only city/country leave the API. street +
--                           postal_code stay server-side. This is the safe
--                           default so an unmigrated/unedited row can never
--                           leak a home address.
--   'full'                — the provider explicitly chose to publish the
--                           street address on their public profile.
--
-- lat/lng are reserved for a future distance feature. They are nullable and
-- currently UNUSED — nothing geocodes, and the public profile renders a plain
-- link to OpenStreetMap rather than an embedded map (no third-party script,
-- no iframe, no network call on load: a map embed would set cookies and leak
-- the visitor's IP on a page where someone is looking for a psychologist —
-- special-category context under GDPR/ePrivacy).
--
-- Idempotent: safe to run more than once (ADD COLUMN IF NOT EXISTS + guarded
-- constraint). Reversal notes at end.
-- ============================================================================

ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS street             text,
  ADD COLUMN IF NOT EXISTS postal_code        text,
  ADD COLUMN IF NOT EXISTS address_visibility text NOT NULL DEFAULT 'city_only',
  ADD COLUMN IF NOT EXISTS reachability       text,
  ADD COLUMN IF NOT EXISTS lat                numeric,
  ADD COLUMN IF NOT EXISTS lng                numeric;

-- Constrain the visibility switch to the two supported values. Guarded so a
-- re-run does not fail on the already-present constraint.
DO $$ BEGIN
  ALTER TABLE provider_profiles
    ADD CONSTRAINT provider_profiles_address_visibility_check
    CHECK (address_visibility IN ('full', 'city_only'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Existing rows predate the column and never consented to publishing a street
-- address: force them to the private default (no-op on a fresh install).
UPDATE provider_profiles
   SET address_visibility = 'city_only'
 WHERE address_visibility IS NULL;

-- Reversal (manual):
--   ALTER TABLE provider_profiles
--     DROP CONSTRAINT IF EXISTS provider_profiles_address_visibility_check,
--     DROP COLUMN IF EXISTS street,
--     DROP COLUMN IF EXISTS postal_code,
--     DROP COLUMN IF EXISTS address_visibility,
--     DROP COLUMN IF EXISTS reachability,
--     DROP COLUMN IF EXISTS lat,
--     DROP COLUMN IF EXISTS lng;
