-- 0009_bond_operations.sql
--
-- Makes Bond operable: a place to store the operator's settings, and a record
-- of what each reply actually cost.
--
-- Idempotent throughout, because this project has no migration runner wired yet
-- and this file may be applied by hand more than once.

-- `ai_settings` is a key-value store, so `setting_name` has to be unique for
-- upserts to work at all. Without this, saving settings from the admin console
-- silently inserts a second row and reads become non-deterministic.
CREATE UNIQUE INDEX IF NOT EXISTS ai_settings_setting_name_key
  ON ai_settings (setting_name);

-- One row per model reply.
--
-- Token counts and prices are recorded AS CHARGED AT THE TIME, not looked up
-- later: gateway pricing changes, and a cost report that silently reprices
-- history is worse than no report. `cost_usd` is derived here on purpose.
--
-- Deliberately contains NO message content — this table is for cost and volume,
-- and Bond conversations are GDPR Art. 9 special-category data. `user_key` is a
-- coarse identifier (hashed IP or, later, a user id), never an email.
CREATE TABLE IF NOT EXISTS coach_usage (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  user_key       text        NOT NULL,
  model          text        NOT NULL,
  input_tokens   integer     NOT NULL DEFAULT 0,
  output_tokens  integer     NOT NULL DEFAULT 0,
  cost_usd       numeric(12, 6) NOT NULL DEFAULT 0,
  ok             boolean     NOT NULL DEFAULT true
);

-- The two queries the admin console runs: "spend over time" and "is this person
-- over their daily cap".
CREATE INDEX IF NOT EXISTS coach_usage_created_at_idx ON coach_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS coach_usage_user_key_idx   ON coach_usage (user_key, created_at DESC);
