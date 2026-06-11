-- 021_factchecks.sql
-- Fact-check copilot (Phase 0: internal admin tool).
--
-- Each row is one fact-check job: the raw input (text claim or URL), the
-- AI-extracted claim(s), the draft verdict with evidence, and the human
-- review decision. NOTHING in this table is public until a human sets
-- status='confirmed' — the copilot drafts, the admin decides. That gate is
-- the whole credibility model: no raw AI verdict ever ships as fact.
--
-- Verdict ladder (IFCN-style, deliberately not a binary):
--   true | partly_true | misleading | false | unverifiable | needs_context
-- 'unverifiable' and 'needs_context' are the honest escape hatches that stop
-- the model from being forced into a confident wrong answer.

create table if not exists factchecks (
  id              uuid primary key default uuid_generate_v4(),

  -- Input
  input_type      text not null default 'text'
                  check (input_type in ('text','url')),
  input_content   text not null,            -- the claim text or the URL
  fetched_excerpt text,                     -- for URLs: what we extracted

  -- Pipeline output (AI draft — NOT public truth)
  claim_text      text,                     -- the main checkable claim, normalized
  claims          jsonb,                    -- all extracted claims [{text, checkable}]
  verdict         text
                  check (verdict in ('true','partly_true','misleading','false',
                                     'unverifiable','needs_context')),
  confidence      numeric,                  -- 0..1 from the synthesis step
  rationale       text,                     -- why, in one paragraph
  what_would_change text,                   -- what evidence would flip this verdict
  evidence        jsonb,                    -- [{url, outlet, tier, headline, stance}]
  debunk_match    jsonb,                    -- matched propaganda_events / fake_news rows
  dmk_match       jsonb,                    -- matched DMK schemes (credit-steal angle)

  -- Job + review state
  status          text not null default 'queued'
                  check (status in ('queued','running','draft','confirmed',
                                    'rejected','error')),
  error_detail    text,
  reviewer_note   text,
  reviewed_at     timestamptz,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_factchecks_status  on factchecks (status);
create index if not exists idx_factchecks_created on factchecks (created_at desc);

alter table factchecks enable row level security;
-- Public can read ONLY confirmed checks (future Phase 3 surface); everything
-- else stays admin-only via the service-role key the backend uses.
do $$ begin
  create policy "public read confirmed factchecks"
    on factchecks for select using (status = 'confirmed');
exception when duplicate_object then null; end $$;
