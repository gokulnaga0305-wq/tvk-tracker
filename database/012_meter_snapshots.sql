-- Daily snapshots of the incumbency meter score for trend analysis.
--
-- The meter is currently a point-in-time number. We want to plot how it
-- moves week-over-week as new incidents accrue, promises are kept/broken,
-- press sentiment shifts, economic data lands.
--
-- A small GH Action cron (.github/workflows/meter-snapshot.yml) hits the
-- snapshot endpoint daily; the IncumbencyMeter UI fetches the last 90
-- snapshots and renders a sparkline above the score.
--
-- One row per day per snapshot. We keep score + zone + the full breakdown
-- + raw_inputs as jsonb so future analytics can drill down without losing
-- fidelity (e.g. plot the press_sentiment_pressure component over time).

create table if not exists meter_snapshots (
  id              uuid primary key default uuid_generate_v4(),
  captured_at     timestamptz not null default now(),
  -- Snapshot day in IST so daily granularity collapses cleanly even if
  -- the cron drifts by minutes. Unique on this so the daily action is
  -- idempotent — a re-run replaces, never duplicates.
  snapshot_date   date not null,
  score           numeric not null,
  zone            text   not null,
  zone_label      text   not null,
  govt_day        int    not null,
  anti_pressure_total  numeric not null default 0,
  pro_boost_total      numeric not null default 0,
  honeymoon_softener   numeric not null default 0,
  breakdown       jsonb,    -- full per-component pts split
  raw_inputs      jsonb,    -- raw counts (incidents, sentiment, etc.)
  factors         jsonb     -- top driving-factor bullets at snapshot time
);

create unique index if not exists uq_meter_snapshot_date
  on meter_snapshots (snapshot_date);
create index if not exists idx_meter_snapshot_captured
  on meter_snapshots (captured_at desc);

alter table meter_snapshots enable row level security;
create policy "public read meter snapshots"
  on meter_snapshots for select using (true);
