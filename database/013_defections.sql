-- Horse-trading tracker: opposition MLAs / leaders crossing over to TVK.
--
-- Rather than buying votes from the public, a winning ruling party in
-- post-DMK Tamil Nadu can manufacture a legislative majority faster by
-- pulling sitting AIADMK / Congress / DMK MLAs over with cabinet seats,
-- buried CBI cases, or cash.  When this happens at scale it's the most
-- recognisable signal of an incumbent that can't win on merit.
--
-- One row per defection.  Tracks:
--   - WHO crossed (name, constituency, original party)
--   - WHEN (resignation date + join date — can differ by weeks)
--   - STATED reason (public PR — "philosophical alignment", "dev work")
--   - ALLEGED reason (what's actually probably happening — cabinet promise,
--                     CBI case dropped, money trail, etc.) with evidence
--   - PENDING cases at time of defection (jsonb of {court, case_no, status})
--   - EVIDENCE urls (press articles, court orders)
--   - STATUS gate (pending / verified / disputed) — same gating discipline
--     as incidents so we don't publish unverified poaching claims.

create table if not exists defections (
  id              uuid primary key default uuid_generate_v4(),
  mla_name        text not null,
  constituency    text,
  from_party      text not null default 'AIADMK',
  to_party        text not null default 'TVK',
  resignation_date date,
  joined_date      date,
  stated_reason   text,
  alleged_reason  text,
  pending_cases   jsonb default '[]'::jsonb,
  evidence_urls   text[] default '{}',
  severity        int default 3 check (severity between 1 and 5),
  ai_confidence   numeric default 0.5,
  status          text not null default 'pending'
                  check (status in ('pending', 'verified', 'disputed', 'retracted')),
  retraction_reason text,
  notes           text,
  ai_raw          jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_defections_dates
  on defections (joined_date desc nulls last, resignation_date desc nulls last);
create index if not exists idx_defections_status
  on defections (status, joined_date desc nulls last);
create index if not exists idx_defections_party_pair
  on defections (from_party, to_party);

alter table defections enable row level security;
create policy "public read defections" on defections for select
  using (status in ('verified', 'pending'));   -- show pending publicly with badge
