-- Verification & trust architecture migration
-- Run after 001_schema.sql

-- ===========================================================
-- Extend incidents with verification + media + fact-check fields
-- ===========================================================
alter table incidents
  add column if not exists verification_status text default 'pending_verification'
    check (verification_status in (
      'pending_verification',     -- single source, awaiting cross-reference
      'multi_source_verified',    -- 2+ independent sources confirmed
      'admin_verified',           -- human-reviewed and approved
      'admin_rejected',           -- human-reviewed and rejected
      'retracted'                 -- previously published, now retracted
    )),
  add column if not exists source_count int default 1,
  add column if not exists related_factchecks jsonb default '[]'::jsonb,
  add column if not exists image_urls text[] default '{}',
  add column if not exists image_verdicts jsonb default '[]'::jsonb,
    -- [{url, ai_suspicion, reverse_search_matches, verdict, reviewed_by, reviewed_at}]
  add column if not exists related_dmk_scheme text,
  add column if not exists retraction_reason text,
  add column if not exists retracted_at timestamptz,
  add column if not exists event_signature text;
    -- Normalised key for dedup/grouping: lower(category) + ':' + lower(location or '') + ':' + incident_date

create index if not exists idx_incidents_event_signature on incidents(event_signature);
create index if not exists idx_incidents_verification_status on incidents(verification_status);

-- ===========================================================
-- Extend sources with credibility tier
-- ===========================================================
alter table sources
  add column if not exists credibility_tier text default 'established_press'
    check (credibility_tier in (
      'primary', 'established_press', 'regional_press',
      'online_native', 'social_media', 'anonymous_social', 'spark_plus'
    ));

-- ===========================================================
-- DMK schemes registry — for credit-steal detection
-- ===========================================================
create table if not exists dmk_schemes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  aliases text[] default '{}',
  launch_date date not null,
  description text not null,
  key_features text,
  beneficiaries_count text,
  evidence_urls text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_dmk_schemes_name on dmk_schemes(name);
create index if not exists idx_dmk_schemes_aliases on dmk_schemes using gin(aliases);

alter table dmk_schemes enable row level security;
create policy "public read dmk_schemes" on dmk_schemes for select using (true);

-- ===========================================================
-- Audit log — records every status transition on an incident
-- ===========================================================
create table if not exists incident_audit (
  id uuid primary key default uuid_generate_v4(),
  incident_id uuid references incidents(id) on delete cascade,
  action text not null,
    -- created, status_change, verified, retracted, edited
  from_value text,
  to_value text,
  actor text default 'system',
    -- 'system', 'ai', or admin username
  reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_incident_audit_incident on incident_audit(incident_id);

alter table incident_audit enable row level security;
create policy "public read incident_audit" on incident_audit for select using (true);

-- ===========================================================
-- Citizen submissions — public reporting (Phase 5)
-- ===========================================================
create table if not exists citizen_reports (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  category text,
  location text,
  incident_date date,
  reporter_name text,
  reporter_contact text,
  image_urls text[] default '{}',
  status text default 'pending_moderation'
    check (status in ('pending_moderation', 'approved', 'rejected', 'duplicate')),
  promoted_to_incident_id uuid references incidents(id),
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by text,
  ip_hash text,
  created_at timestamptz default now()
);

create index if not exists idx_citizen_reports_status on citizen_reports(status);

alter table citizen_reports enable row level security;
-- Only approved citizen reports are publicly readable
create policy "public read approved citizen reports"
  on citizen_reports for select
  using (status = 'approved');
-- Anyone can INSERT a report (rate-limited at API layer, not RLS)
create policy "anyone can submit citizen report"
  on citizen_reports for insert
  with check (true);
