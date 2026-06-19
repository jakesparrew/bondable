-- ============================================================================
-- Bondable — add profiles.is_regulated (0002_add_is_regulated.sql)
-- ----------------------------------------------------------------------------
-- Run this on already-provisioned databases that predate the is_regulated
-- column. Fresh installs from drizzle/0000_init.sql already include it.
--
-- is_regulated distinguishes REGULATED clinicians (therapists / psychologists,
-- whose referral commissions are restricted by the Belgian dichotomieverbod)
-- from non-regulated coaches — enabling a referral-neutral finder.
--
-- Idempotent: safe to run more than once (ADD COLUMN IF NOT EXISTS).
-- ============================================================================

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_regulated" boolean NOT NULL DEFAULT false;
