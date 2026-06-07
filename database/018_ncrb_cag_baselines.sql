-- 018_ncrb_cag_baselines.sql
-- Two jobs:
--   1. CORRECT the NCRB crime baselines (the seeded murders/crimes-vs-women
--      figures were unsourced and wrong — murders was 2,725, real NCRB 2022
--      figure is 1,690). Mark every row with an explicit confidence flag.
--   2. ADD a cag_findings table with official CAG State Finances Audit Report
--      figures for the DMK tenure (FY 2022-23). These are quotable official
--      totals (no press-sample caveat).
--
-- Safe to re-run (idempotent updates + create-if-not-exists + on-conflict).

-- ---------------------------------------------------------------------------
-- 1. Add confidence column to baselines, then correct the verified rows.
-- ---------------------------------------------------------------------------
alter table baselines add column if not exists confidence text default 'estimate';

-- Murders: real NCRB Crime in India 2022 TN total = 1,690 (~140.8/month).
update baselines set
  dmk_monthly_avg = 140.8,
  confidence      = 'verified',
  source          = 'NCRB Crime in India 2022, Tamil Nadu state total (1,690 murders)',
  period          = '2022 annual /12',
  notes           = 'TN recorded 1,690 murders in 2022 (NCRB) ~141/month. Corrected from an earlier unsourced 2,725 figure.'
where category = 'murders';

-- Crimes vs women: NCRB 2022 TN = 9,207 (2021: 8,501). Women only; POCSO/child
-- not separately verified, so this UNDERstates the combined total.
update baselines set
  label           = 'Crimes vs Women',
  dmk_monthly_avg = 767.0,
  confidence      = 'verified',
  source          = 'NCRB Crime in India 2022, Tamil Nadu (9,207 crimes against women; 8,501 in 2021)',
  period          = '2022 annual /12',
  notes           = 'TN: 9,207 crimes-against-women cases in 2022 (up from 8,501 in 2021) ~767/month. Women only; POCSO/child excluded (not separately verified).'
where category = 'crimes_women_kids';

-- Everything else stays as published earlier but is explicitly flagged as an
-- unverified estimate so the UI never implies false precision.
update baselines set confidence = 'estimate'
  where category in ('sexual_assault','corruption','custodial_death',
                     'honour_killing','police_excess','communal_violence',
                     'industrial_flight');

-- ---------------------------------------------------------------------------
-- 2. CAG findings table (official DMK-tenure audit figures).
-- ---------------------------------------------------------------------------
create table if not exists cag_findings (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  label       text not null,
  value       text not null,
  trend       text not null default 'flat',   -- down(good) | flat | bad
  detail      text not null,
  report      text not null,
  source_url  text,
  sort_order  int default 0,
  updated_at  timestamptz default now()
);

alter table cag_findings enable row level security;
do $$ begin
  create policy "public read cag_findings" on cag_findings for select using (true);
exception when duplicate_object then null; end $$;

insert into cag_findings (key, label, value, trend, detail, report, source_url, sort_order) values
  ('revenue_deficit', 'Revenue deficit (FY 2022-23)', E'₹36,215 cr', 'down',
   'Down 22% from ₹46,538 cr in 2021-22. The state still spent more on day-to-day running than it earned, but the gap narrowed.',
   'CAG SFAR, Report No. 2 of 2024 (FY 2022-23)',
   'https://cag.gov.in/webroot/uploads/download_audit_report/2023/Report-No-2-of-2024-SFAR-English-0675955f21ba460.87039330.pdf', 1),
  ('fiscal_deficit', 'Fiscal deficit (FY 2022-23)', E'₹81,886 cr', 'flat',
   'Essentially unchanged from ₹81,835 cr in 2021-22 (+0.06%). Within the borrowing limit, but not falling.',
   'CAG SFAR, Report No. 2 of 2024 (FY 2022-23)',
   'https://cag.gov.in/webroot/uploads/download_audit_report/2023/Report-No-2-of-2024-SFAR-English-0675955f21ba460.87039330.pdf', 2),
  ('borrowing_misuse', 'Borrowings used for consumption, not assets', 'only 39% to capital', 'bad',
   'CAG flagged that just 39% of borrowed funds went to capital creation/development; the rest covered current consumption and debt repayment. Capital spend was only 12.1% of total expenditure (₹39,530 cr).',
   'CAG SFAR, Report No. 2 of 2024 (FY 2022-23)',
   'https://cag.gov.in/webroot/uploads/download_audit_report/2023/Report-No-2-of-2024-SFAR-English-0675955f21ba460.87039330.pdf', 3),
  ('debt_growth', 'Public debt growth rate', '15.86%/yr avg', 'bad',
   'Public debt grew at an average 15.86% per year between 2018-19 and 2022-23. Outstanding liabilities were 28.64% of GSDP (just under the 29.30% ceiling).',
   'CAG SFAR, Report No. 2 of 2024 (FY 2022-23)',
   'https://cag.gov.in/webroot/uploads/download_audit_report/2023/Report-No-2-of-2024-SFAR-English-0675955f21ba460.87039330.pdf', 4),
  ('pending_ucs', 'Unaccounted grant money (pending UCs)', E'₹1,435.43 cr', 'bad',
   '48 Utilisation Certificates worth ₹1,435.43 cr were still outstanding as on 31 Mar 2023 grant money given out but not yet accounted for.',
   'CAG SFAR, Report No. 2 of 2024 (FY 2022-23)',
   'https://cag.gov.in/webroot/uploads/download_audit_report/2023/Report-No-2-of-2024-SFAR-English-0675955f21ba460.87039330.pdf', 5),
  ('psu_arrears', 'PSUs with accounts in arrears', '16 PSUs / 22 accounts', 'bad',
   '16 state PSUs had 22 accounts in arrears, missing prescribed deadlines for submitting financial statements an audit/transparency gap.',
   'CAG SFAR, Report No. 2 of 2024 (FY 2022-23)',
   'https://cag.gov.in/webroot/uploads/download_audit_report/2023/Report-No-2-of-2024-SFAR-English-0675955f21ba460.87039330.pdf', 6)
on conflict (key) do nothing;
