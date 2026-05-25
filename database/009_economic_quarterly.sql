-- Quarterly TVK-era economic observations for sector-wise CAGR comparison
-- against the static DMK baselines defined in app/api/routes/economic.py.
--
-- One row = one published quarterly observation for one metric, sourced from
-- TN Economic Survey / MoSPI / RBI State Finances / DPIIT FDI fact-sheets,
-- etc.  The /api/economic/dashboard endpoint picks the most-recent
-- observation per metric_key and computes delta_pp vs the DMK CAGR.
--
-- Why a separate table from `baselines`:
--   * baselines = static DMK monthly averages of event counts
--   * this table = streaming TVK quarterly observations of % rates / levels
--   They're different shapes and benefit from different write patterns.
--
-- Admin-only inserts via POST /api/economic/quarterly (header x-admin-secret).

create table if not exists economic_quarterly_data (
  id           uuid primary key default uuid_generate_v4(),
  metric_key   text not null,            -- references DMK_CAGR_BASELINES.key in app code
  fy           int  not null,            -- e.g. 2027 means FY2026-27
  quarter      int  not null check (quarter between 1 and 4),
  value        numeric not null,         -- observed level OR observed % rate
  value_type   text not null check (value_type in ('cagr_pct','yoy_pct','level')),
  source       text not null,            -- e.g. "TN Economic Survey 2026-27"
  source_url   text,
  notes        text,
  ingested_at  timestamptz default now()
);

create index if not exists idx_econ_quarterly_metric
  on economic_quarterly_data (metric_key, fy desc, quarter desc, ingested_at desc);

alter table economic_quarterly_data enable row level security;

-- Anyone can read (it's all from public RBI/MoSPI/TN-govt PDFs anyway);
-- only the backend (service-role key) can write.
create policy "public read economic quarterly"
  on economic_quarterly_data for select using (true);
