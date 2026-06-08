-- 019_investment_commitments.sql
-- Phase 1 of the Investment Commitment Registry.
-- A baseline watchlist of flagship DMK-era (2021-26) investment MoUs/projects.
-- A "loss" is just a row flipping status -> shifted/cancelled WITH a source.
--
-- Scope is FLAGSHIP commitments (by ₹/jobs), NOT every one of the 631 GIM-2024
-- MoUs — tracking the big fish is what matters and what's publicly verifiable.
-- Figures sourced from GIM 2024 coverage + project announcements (2021-2026).

create table if not exists investment_commitments (
  id                uuid primary key default uuid_generate_v4(),
  company           text not null,
  sector            text,
  amount_cr         numeric,                 -- committed ₹ in crore
  jobs_promised     integer,                 -- nullable when not disclosed
  location          text,                    -- district / city
  mou_date          date,
  govt_era          text default 'dmk',      -- which govt secured it
  source_event      text,                    -- e.g. 'GIM 2024', 'Sept 2025 MoU'
  source_url        text,
  status            text not null default 'committed',
  status_note       text,
  status_source_url text,
  last_checked      timestamptz,
  is_flagship       boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  constraint inv_status_chk check (status in
    ('committed','in_progress','operational','stalled','shifted','cancelled'))
);

create unique index if not exists inv_company_event_uq
  on investment_commitments (company, coalesce(source_event,''));

alter table investment_commitments enable row level security;
do $$ begin
  create policy "public read investment_commitments"
    on investment_commitments for select using (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Seed: flagship DMK-era commitments. Statuses are conservative/factual at
-- seed time; the weekly watcher (Phase 2) updates them as news breaks.
-- ---------------------------------------------------------------------------
insert into investment_commitments
  (company, sector, amount_cr, jobs_promised, location, mou_date, source_event, status, status_note) values
  ('Tata Power',        'Renewable energy',   70800, null,  'Tirunelveli / TN',      '2024-01-07', 'GIM 2024',     'committed',  'Solar cell & module manufacturing'),
  ('Adani Group',       'Ports & energy',     42768, null,  'TN',                    '2024-01-07', 'GIM 2024',     'committed',  null),
  ('Sembcorp (Singapore)','Renewable energy', 36238, null,  'TN',                    '2024-01-07', 'GIM 2024',     'committed',  'Green energy / hydrogen'),
  ('Leap Green',        'Renewable energy',   22000, null,  'TN',                    '2024-01-07', 'GIM 2024',     'committed',  null),
  ('CPCL',              'Petroleum',          17000, null,  'Nagapattinam (Cauvery)','2024-01-07', 'GIM 2024',     'in_progress','Cauvery Basin refinery'),
  ('HD Hyundai',        'Shipbuilding',       16600, null,  'Thoothukudi',           '2025-12-07', 'Dec 2025',     'committed',  '~$2bn greenfield shipyard interest'),
  ('VinFast',           'Electric vehicles',  16000, null,  'Thoothukudi',           '2023-05-25', 'MoU 2023',     'in_progress','EV plant; Phase-1 inaugurated 2025'),
  ('Mazagon Dock',      'Shipbuilding',       15000, 45000, 'Thoothukudi',           '2025-09-19', 'Sept 2025 MoU','committed',  'Exploring rival Andhra cluster — WATCH'),
  ('Cochin Shipyard',   'Shipbuilding',       15000, 10000, 'Thoothukudi',           '2025-09-19', 'Sept 2025 MoU','committed',  null),
  ('Tata Electronics',  'Electronics',        12080, null,  'Hosur (Krishnagiri)',   '2023-01-01', 'DMK tenure',   'operational','Mobile component / assembly'),
  ('Ola Electric',      'Electric vehicles',  10000, null,  'Krishnagiri (Hosur)',   '2022-01-01', 'DMK tenure',   'operational','FutureFactory gigafactory'),
  ('Hyundai Motor India','Automotive / EV',    6180, null,  'Kancheepuram',          '2023-05-01', 'DMK tenure',   'operational','ICE + EV + batteries expansion'),
  ('L&T',               'IT / innovation',     3500, 40000, 'Chennai',               '2024-01-07', 'GIM 2024',     'in_progress','Innovation Campus'),
  ('Saint-Gobain',      'Glass & materials',   3400, 1100,  'Kancheepuram/Erode',    '2024-01-07', 'GIM 2024',     'committed',  null),
  ('Royal Enfield',     'Automotive',          3000, 2000,  'TN',                    '2024-01-07', 'GIM 2024',     'committed',  null),
  ('Salcomp',           'Electronics',         2271, 15000, 'Kancheepuram',          '2024-01-07', 'GIM 2024',     'in_progress',null),
  ('Pegatron',          'Electronics',         1000, 8000,  'Chennai',               '2024-01-07', 'GIM 2024',     'operational','C3 electronics unit')
on conflict (company, coalesce(source_event,'')) do nothing;
