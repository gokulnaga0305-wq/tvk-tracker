-- 025: fact_checks — the canonical, protocol-enforced fact-check store.
--
-- Until now, debunks were scattered (propaganda_events, the Copilot's
-- `factchecks` working table, incidents.is_credit_steal). This table is the ONE
-- place every published verdict lives, carrying the Fact-Check Protocol
-- (FACT_CHECK_PROTOCOL.md): a verdict, an evidence tier, the conceded points,
-- and what-would-change. The YouTurn fetcher, watched-handle candidates, the
-- Copilot and manual adds all normalise into a row here.
--
-- NOTE: distinct from the legacy `factchecks` (no underscore) — that is the
-- admin Copilot's working/draft store. `fact_checks` is the canonical ledger.

CREATE TABLE IF NOT EXISTS fact_checks (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The claim
    claim             TEXT NOT NULL,           -- the claim being checked
    claim_summary     TEXT,                    -- one-line, for cards

    -- Verdict ladder (Protocol A)
    verdict           TEXT NOT NULL CHECK (verdict IN (
        'true', 'mostly_true', 'misleading', 'false', 'unproven',
        'credit_steal', 'manufactured_first', 'fabricated')),

    -- Evidence tier 1 (primary doc) .. 5 (social-only). Protocol B.
    evidence_tier     SMALLINT NOT NULL CHECK (evidence_tier BETWEEN 1 AND 5),
    confidence        NUMERIC(3,2),            -- 0.00 - 1.00

    -- Whose narrative it serves (TVK / DMK / AIADMK / BJP / ...)
    favoring          TEXT,

    -- The honest-caveat rule (Protocol C) — mandatory in practice
    concedes          TEXT,                    -- the other side's true points / what's genuine
    what_would_change TEXT,                    -- what evidence flips the verdict

    -- Sourcing
    debunk_source     TEXT,                    -- 'YouTurn', 'Govt GO', 'The Hindu', ...
    debunk_url        TEXT,
    sources           TEXT[] DEFAULT '{}',
    tags              TEXT[] DEFAULT '{}',

    first_seen        DATE,

    -- Workflow (Protocol E). Only 'published' is shown publicly.
    status            TEXT NOT NULL DEFAULT 'published' CHECK (status IN (
        'new', 'verified', 'published', 'rejected')),
    reviewer_note     TEXT,

    -- Provenance (Protocol F) — for tracing + idempotent sync
    origin            TEXT,   -- youturn | tweet_watch | copilot | propaganda_event | credit_steal | manual
    origin_id         UUID,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent sync: one fact_check per source row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_factchecks_origin
    ON fact_checks (origin, origin_id) WHERE origin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_factchecks_verdict   ON fact_checks (verdict);
CREATE INDEX IF NOT EXISTS idx_factchecks_favoring  ON fact_checks (favoring);
CREATE INDEX IF NOT EXISTS idx_factchecks_status    ON fact_checks (status);
CREATE INDEX IF NOT EXISTS idx_factchecks_firstseen ON fact_checks (first_seen DESC);

-- RLS: public read of PUBLISHED rows only; service-role full access.
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY factchecks_public_read ON fact_checks
    FOR SELECT USING (status = 'published');

CREATE POLICY factchecks_admin_all ON fact_checks
    FOR ALL USING (auth.role() = 'service_role');
