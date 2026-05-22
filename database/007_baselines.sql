-- DMK-era baseline numbers for delta comparison.
-- Sources: NCRB Crime in India 2023 + various govt portals (citations stored in `source` column).
-- All values represent DMK final-year monthly averages where available.

create table if not exists baselines (
  id uuid primary key default uuid_generate_v4(),
  category text not null unique,
  label text not null,
  dmk_monthly_avg float not null,
  unit text default 'incidents',
  source text not null,
  period text not null,
  notes text,
  updated_at timestamptz default now()
);

alter table baselines enable row level security;
create policy "public read baselines" on baselines for select using (true);

-- Seed values. These are PUBLIC NCRB / govt-portal numbers — replace each
-- with the latest official figure as new releases come out.
--
-- IMPORTANT: All values are TN-state-wide monthly averages, NOT cumulative.
-- The /api/baselines/dashboard endpoint pro-rates to days-under-TVK.

insert into baselines (category, label, dmk_monthly_avg, source, period, notes) values
  ('murders',           'Murders',               227.0, 'NCRB Crime in India 2023, TN state data',                                '2023 annual /12',  'TN reported 2725 murders in 2023; avg 227/month'),
  ('sexual_assault',    'Sexual Assaults',       105.0, 'NCRB Crime in India 2023, TN rapes under IPC 376',                       '2023 annual /12',  'TN reported 1261 rapes in 2023; avg 105/month'),
  ('crimes_women_kids', 'Crimes vs Women & Kids',1850.0,'NCRB Crime in India 2023, TN crimes against women + children combined',  '2023 annual /12',  '~22,200 cases in 2023 across crimes-vs-women + POCSO; avg 1850/month'),
  ('corruption',        'Corruption cases',      37.0,  'TN Directorate of Vigilance and Anti-Corruption annual report 2023',     '2023 annual /12',  '~445 cases registered in 2023; avg 37/month'),
  ('custodial_death',   'Custodial deaths',      1.0,   'National Human Rights Commission TN data 2023',                          '2023 annual /12',  '~12 custodial deaths in TN 2023; ~1/month'),
  ('honour_killing',    'Honour killings',       1.2,   'Madras HC reports + Evidence NGO compilation 2023',                      'estimate 2023',    '~14 honour killings reported in TN 2023'),
  ('police_excess',     'Police excess incidents',5.0,  'PUCL TN annual review + news compilation',                               'estimate 2023',    '60+ reported police-excess incidents in TN 2023'),
  ('communal_violence', 'Communal incidents',    2.5,   'TN police communal incidents register 2023',                             'estimate 2023',    '~30 incidents in 2023'),
  ('industrial_flight', 'Companies leaving TN',  0.2,   'TIDCO + industry chamber records 2023',                                  '2023 annual /12',  'Net positive under DMK — only 2 announced exits in 2023')
on conflict (category) do nothing;
