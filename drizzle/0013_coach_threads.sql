-- 0013_coach_threads.sql
--
-- Server-side storage for a signed-in visitor's Coach conversation.
--
-- This is the table that makes Bond's cap-promise TRUE. At the anonymous
-- limit, Bond says "maak een account aan, dan bewaar ik dit gesprek" — until
-- now that conversation lived only in the page's memory and was gone on
-- reload. One row per account: Bond is a companion with one continuous
-- thread, not a chat app with an inbox.
--
-- GDPR posture (this is Art. 9-adjacent content):
--   * stored only for signed-in users who were explicitly promised saving —
--     anonymous conversations are never written anywhere
--   * DELETE /api/coach-thread is the user's erase button and removes the row
--     outright, not a soft delete
--   * no FK to neon_auth."user": that schema is Neon-managed (same reasoning
--     as profiles.auth_user_id in migration 0012)
--
-- Idempotent, because this project applies migrations by hand.

CREATE TABLE IF NOT EXISTS coach_threads (
  auth_user_id     uuid        PRIMARY KEY,
  -- Array of {id, role: 'bond'|'user', text, createdAt, crisis?} — the
  -- client's own message shape, stored as-is so restore is lossless.
  messages         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- Rolling summary of everything older than the recent window, so long
  -- threads keep continuity without resending the whole history each turn.
  summary          text,
  -- How many messages the current summary covers; drives re-summarising.
  summarized_count integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
