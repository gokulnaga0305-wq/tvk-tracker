-- 020_feed_health.sql
-- True per-feed fetch telemetry.
--
-- Why: the diagnostics "source freshness" metric reads the `sources` table,
-- which only records when an ARTICLE from an outlet was last stored. That
-- can't distinguish a dead feed from a quiet outlet (e.g. "moneycontrol
-- broken" really meant "moneycontrol hasn't covered TN in 3 days").
-- This table records the actual fetch outcome per configured feed, so
-- "broken" means broken: HTTP failure / parse failure / repeated zero-fetch.
--
-- Written by rss_ingest.ingest_one_source after every fetch attempt.
-- Read by /api/diagnostics/usage, /api/diagnostics/data-health, and the
-- daily review digest's feed alarm.

create table if not exists feed_health (
  feed_label            text primary key,        -- SOURCES_RSS source_label
  feed_name             text,                    -- human-readable name
  last_attempt_at       timestamptz,             -- every fetch updates this
  last_success_at       timestamptz,             -- only successful fetches
  last_http_ok          boolean,
  last_item_count       integer,                 -- items the feed returned
  last_new_processed    integer,                 -- items that got AI-processed
  consecutive_failures  integer default 0,
  last_error            text,
  updated_at            timestamptz default now()
);

alter table feed_health enable row level security;
do $$ begin
  create policy "public read feed_health"
    on feed_health for select using (true);
exception when duplicate_object then null; end $$;
