-- 0007_analytics.sql — the single analytics spine (R12). Additive; safe re-run.

CREATE TABLE IF NOT EXISTS analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                 -- snake_case event name
  profile_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  role        text,
  props       jsonb,                         -- NEVER special-category/health data
  session_id  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events (name);
CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events (created_at);

CREATE TABLE IF NOT EXISTS metric_daily (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day     date NOT NULL,
  metric  text NOT NULL,
  value   numeric NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS metric_daily_day_metric_uidx ON metric_daily (day, metric);
