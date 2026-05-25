-- Auto-ingest pipeline for the sectoral economy panel.
--
-- The actual economic numbers (RBI State Finances, MoSPI GSVA, DPIIT FDI,
-- DGCI&S exports etc.) land at predictable cadences but on PDF/HTML pages
-- that change unpredictably.  Rather than scraping the numbers directly
-- (fragile and easy to get wrong), we watch the publication pages for
-- changes and surface "this URL changed, an admin should check it" in the
-- /admin/economic UI.  The admin then enters the verified number through
-- the existing observation form.
--
-- Two tables:
--   economic_release_watches   — the URLs we monitor + their last-known hash
--   economic_release_events    — append-only log of detected changes;
--                                admin acks them to silence the alert.

create table if not exists economic_release_watches (
  id              uuid primary key default uuid_generate_v4(),
  label           text not null,                 -- "DPIIT FDI Quarterly Fact Sheet"
  url             text not null unique,          -- page we poll
  publisher       text not null,                 -- "DPIIT" / "MoSPI" / "RBI" / "TN Finance Dept"
  related_metrics text[] not null default '{}',  -- e.g. ['fdi_inflow_cagr']
  cadence_days    int not null default 30,       -- expected days between releases
  last_hash       text,                          -- sha256 of last fetched body
  last_checked    timestamptz,
  last_changed_at timestamptz,
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists economic_release_events (
  id              uuid primary key default uuid_generate_v4(),
  watch_id        uuid not null references economic_release_watches(id) on delete cascade,
  detected_at     timestamptz default now(),
  old_hash        text,
  new_hash        text not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'acknowledged', 'dismissed')),
  ack_by          text,
  ack_at          timestamptz,
  notes           text
);

create index if not exists idx_release_events_pending
  on economic_release_events (detected_at desc)
  where status = 'pending';

alter table economic_release_watches enable row level security;
alter table economic_release_events  enable row level security;

create policy "public read watches" on economic_release_watches for select using (true);
create policy "public read events"  on economic_release_events  for select using (true);

-- Seed the initial set of URLs we want to monitor.  Add more as new
-- publishers come online (TN State Finance, RBI Handbook etc.).
insert into economic_release_watches (label, url, publisher, related_metrics, cadence_days, notes) values
  ('DPIIT FDI Quarterly Fact Sheet',
   'https://dpiit.gov.in/publications/fdi-statistics',
   'DPIIT',
   ARRAY['fdi_inflow_cagr'],
   90,
   'Quarterly. Look for state-wise table — TN typically rank 1-3.'),
  ('MoSPI GSVA / NSVA portal',
   'https://www.mospi.gov.in/GSVA-NSVA',
   'MoSPI',
   ARRAY['gsdp_real_cagr','gsdp_nominal_cagr','manufacturing_cagr','services_total_cagr','agriculture_cagr'],
   90,
   'State Domestic Product advance estimates released quarterly.'),
  ('RBI State Finances: A Study of Budgets',
   'https://www.rbi.org.in/Scripts/AnnualPublications.aspx?head=State%20Finances%20%3A%20A%20Study%20of%20Budgets',
   'RBI',
   ARRAY['tax_revenue_cagr'],
   365,
   'Annual but with quarterly fiscal indicators in monthly bulletins.'),
  ('TN Budget portal',
   'https://tnbudget.tn.gov.in/',
   'TN Finance Dept',
   ARRAY['gsdp_nominal_cagr','tax_revenue_cagr'],
   90,
   'TN Budget at a Glance + supplementary demands during FY.'),
  ('DGCI&S Foreign Trade Statistics (state-wise)',
   'https://www.commerce.gov.in/about-us/divisions/foreign-trade-territorial-division/',
   'DGCI&S',
   ARRAY['exports_cagr'],
   30,
   'Monthly state-wise exports data — useful for FY27 exports trajectory.')
on conflict (url) do nothing;
