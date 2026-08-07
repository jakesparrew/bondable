-- 0012_use_neon_auth.sql
--
-- Switch from self-hosted Better Auth to Neon Auth.
--
-- WHY: migration 0011 stood up `auth_user`/`auth_session`/`auth_account`/
-- `auth_verification` in the public schema. Neon Auth turned out to already be
-- provisioned on this same database (`neon_auth` schema, created 2026-06-15)
-- running the SAME library, with Google sign-in and an email provider already
-- configured. Self-hosting alongside it meant two credential stores and a
-- second Google OAuth app to register, for no gain.
--
-- Nothing is lost: the 0011 tables never held a real account (the one test user
-- was deleted after verification), so this drops empty tables.

-- Order matters: `profiles.auth_user_id` carries a foreign key to `auth_user`,
-- so the column goes first or the DROP TABLE below fails. Doing it explicitly
-- rather than with DROP ... CASCADE, which would silently take anything else
-- that happened to reference these tables.
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "auth_user_id";

DROP TABLE IF EXISTS "auth_session";
DROP TABLE IF EXISTS "auth_account";
DROP TABLE IF EXISTS "auth_verification";
DROP TABLE IF EXISTS "auth_user";

-- Re-added with the right type: self-hosted Better Auth issues text ids, Neon
-- Auth issues uuids. Safe to drop and re-add because the column was created
-- minutes ago and is empty everywhere.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "auth_user_id" uuid UNIQUE;

-- Deliberately NO foreign key to neon_auth."user".
--
-- That schema is managed by Neon, not by this repo's migrations. A cross-schema
-- FK would make our data depend on a table we do not own the lifecycle of: if
-- Neon ever recreates or migrates it, an FK here turns their routine change
-- into our outage. The UNIQUE constraint still guarantees one login never
-- claims two people, which is the invariant that actually matters.
COMMENT ON COLUMN "profiles"."auth_user_id" IS
  'neon_auth."user".id — no FK on purpose: that schema is managed by Neon.';

CREATE INDEX IF NOT EXISTS "profiles_auth_user_id_idx" ON "profiles" ("auth_user_id");
