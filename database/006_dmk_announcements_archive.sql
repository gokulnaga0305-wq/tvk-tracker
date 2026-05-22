-- DMK Archive — authoritative DMK-era announcements used to detect
-- when TVK government rebrands or claims credit for existing schemes.
--
-- Sources tracked:
--   dmk_website     — official party site (dmk.in/en/achievements)
--   cmo_tamil_nadu  — @CMOTamilnadu (CM office during DMK rule)
--   tn_dipr         — @TNDIPR (govt press release dept under DMK)
--   manual          — admin-curated entries
--
-- Date range of interest: 2021-05-07 (Stalin's swearing-in) to 2026-05-04
-- (final day before TVK transition).

create table if not exists dmk_announcements (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in (
    'dmk_website', 'cmo_tamil_nadu', 'tn_dipr', 'manual'
  )),
  source_url text,
  external_id text,                  -- tweet ID, article slug, etc.
  announcement_date date not null,
  title text not null,
  content text,
  media_urls text[] default '{}',
  scheme_id uuid references dmk_schemes(id) on delete set null,
    -- best-match against dmk_schemes registry; nullable
  scheme_name_hint text,              -- AI's best guess of scheme name even without exact match
  tags text[] default '{}',           -- ['women_welfare', 'education', 'infra', ...]
  raw_data jsonb default '{}'::jsonb,
  scraped_at timestamptz default now(),
  unique(source, external_id)
);

create index if not exists idx_dmk_announce_date    on dmk_announcements(announcement_date desc);
create index if not exists idx_dmk_announce_source  on dmk_announcements(source);
create index if not exists idx_dmk_announce_scheme  on dmk_announcements(scheme_id);
create index if not exists idx_dmk_announce_tags    on dmk_announcements using gin(tags);
-- Full-text search across title + content for fast cross-reference lookups
create index if not exists idx_dmk_announce_fts
  on dmk_announcements using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));

alter table dmk_announcements enable row level security;
create policy "public read dmk_announcements" on dmk_announcements for select using (true);

-- ===========================================================
-- Cross-reference link table on incidents
-- ===========================================================
-- When an incident is flagged as credit_stealing, we attach the matching
-- DMK announcements as evidence. Many-to-many.

create table if not exists incident_dmk_evidence (
  id uuid primary key default uuid_generate_v4(),
  incident_id uuid references incidents(id) on delete cascade,
  announcement_id uuid references dmk_announcements(id) on delete cascade,
  match_score float,                  -- 0-1, AI's confidence the announcement IS the precedent
  match_reason text,                  -- human-readable: "Both mention Magalir Urimai + same monthly amount"
  created_at timestamptz default now(),
  unique(incident_id, announcement_id)
);

create index if not exists idx_evidence_incident on incident_dmk_evidence(incident_id);

alter table incident_dmk_evidence enable row level security;
create policy "public read evidence" on incident_dmk_evidence for select using (true);
