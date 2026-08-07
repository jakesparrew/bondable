-- 0010_coach_protection.sql
--
-- Shared throttle state for The Coach.
--
-- The previous rate limiter was a Map in module scope. On Vercel that is per
-- serverless instance, and dozens run in parallel — each with an empty Map — so
-- parallel requests walked straight through it. A counter that protects a
-- billable endpoint has to live somewhere all instances can see.
--
-- Idempotent: this project has no migration runner wired yet, so this file may
-- be applied by hand more than once.

CREATE TABLE IF NOT EXISTS coach_throttle (
  -- '<scope>:<key>:<window>', e.g. 'ip:9f3a…:29123456'. Scope is part of the
  -- key so IP and device budgets can share one table without colliding.
  bucket      text        PRIMARY KEY,
  count       integer     NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL
);

-- Expired rows are swept opportunistically rather than by a cron: there is no
-- scheduler in this project yet, and an index makes the sweep cheap enough to
-- piggyback on ordinary traffic.
CREATE INDEX IF NOT EXISTS coach_throttle_expires_idx ON coach_throttle (expires_at);
