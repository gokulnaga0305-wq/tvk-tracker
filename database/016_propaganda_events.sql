-- 016: propaganda_events table
--
-- User-flagged structural blind spot: the incumbency meter measures
-- DOCUMENTED accountability events. It does NOT measure how much pro-TVK
-- propaganda is circulating, who's seeing it, or how the information
-- asymmetry between our verified failures and the manipulated feed
-- shapes actual public perception. This table closes that gap by tracking
-- the OTHER side of the information ecosystem — manufactured / misleading
-- / fake content amplified in favor of the TVK government, alongside the
-- debunks our system catches.
--
-- The Propaganda Reach widget on the dashboard reads from this table and
-- juxtaposes it against the accountability events from `incidents`,
-- making the gap honest and visible.

CREATE TABLE IF NOT EXISTS propaganda_events (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    title                TEXT NOT NULL,
    description          TEXT,

    -- How was the truth distorted?
    propaganda_type      TEXT NOT NULL CHECK (propaganda_type IN (
        'manufactured_achievement',    -- claims credit for work not done
        'dubbed_footage',              -- DMK-era footage re-credited to TVK
        'deepfake',                    -- AI-generated face/voice
        'paid_trending',               -- bought hashtags / engagement farms
        'misleading_edit',             -- selective editing, out-of-context
        'fake_quote',                  -- words never said
        'meme_glorification',          -- mass-amplified hero-edits / fan reels
        'astroturfing',                -- fake grassroots
        'misattributed_event',         -- real event credited wrongly
        'other'
    )),

    -- Whose narrative does it serve?
    -- Default 'TVK' since that's what this tracker monitors, but the
    -- column generalizes if we ever track DMK propaganda too.
    favoring             TEXT NOT NULL DEFAULT 'TVK',

    -- Where did it spread?
    platform             TEXT,    -- twitter | instagram | tiktok | whatsapp | facebook | youtube
    propaganda_url       TEXT,    -- the actual fake/manipulated post

    -- How far did it spread?
    -- All reach metrics are estimates / publicly visible counts. Use NULL
    -- when unknown rather than 0 (the asymmetry math handles NULL safely).
    reach_estimate       BIGINT,  -- estimated total viewers/impressions
    likes                BIGINT,
    shares               BIGINT,
    comments             BIGINT,

    -- What's the debunk?
    debunk_url           TEXT,
    debunk_source        TEXT,    -- 'Tamil Spark', 'YouTurn', 'Internal verification', etc.
    debunk_reach_estimate BIGINT, -- how far did the CORRECTION travel

    -- When?
    first_seen           DATE,    -- when propaganda first appeared
    debunked_at          TIMESTAMPTZ,
    incident_date        DATE,    -- the actual event being misrepresented (if any)

    -- Status
    status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',       -- still circulating, not yet debunked
        'debunked',     -- we've published a correction
        'retracted',    -- the propagator deleted it
        'organic'       -- not a fake — just heavy-volume pro-TVK content
                        -- (used to track reach asymmetry even when content
                        --  isn't strictly false)
    )),

    -- Optional cross-references
    related_incident_id  UUID REFERENCES incidents(id) ON DELETE SET NULL,
    -- E.g. the Vaathi Raid JCB fake -> related fake_news incident in `incidents`

    -- Categorization for the dashboard widget
    tags                 TEXT[] DEFAULT '{}',

    -- Source attribution (URLs that documented the propaganda + reach)
    source_urls          TEXT[] DEFAULT '{}',

    -- Audit
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes                TEXT
);

-- Indexes for the asymmetry-summary queries
CREATE INDEX IF NOT EXISTS idx_propaganda_first_seen     ON propaganda_events (first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_propaganda_status         ON propaganda_events (status);
CREATE INDEX IF NOT EXISTS idx_propaganda_type           ON propaganda_events (propaganda_type);
CREATE INDEX IF NOT EXISTS idx_propaganda_favoring       ON propaganda_events (favoring);

-- RLS — same posture as incidents: public read, admin write
ALTER TABLE propaganda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY propaganda_public_read ON propaganda_events
    FOR SELECT USING (true);

CREATE POLICY propaganda_admin_write ON propaganda_events
    FOR ALL USING (auth.role() = 'service_role');

-- Convenient view used by the PropagandaReach widget — computes the
-- asymmetry ratio (propaganda reach / debunk reach) on the fly so the
-- frontend doesn't need to do the math.
CREATE OR REPLACE VIEW propaganda_reach_summary AS
SELECT
    DATE_TRUNC('day', first_seen)::date  AS day,
    COUNT(*)                              AS event_count,
    SUM(COALESCE(reach_estimate, 0))      AS total_propaganda_reach,
    SUM(COALESCE(debunk_reach_estimate, 0)) AS total_debunk_reach,
    CASE
      WHEN SUM(COALESCE(debunk_reach_estimate, 0)) > 0 THEN
        ROUND(SUM(COALESCE(reach_estimate, 0))::numeric
              / NULLIF(SUM(COALESCE(debunk_reach_estimate, 0)), 0), 1)
      ELSE NULL
    END AS asymmetry_ratio
FROM propaganda_events
WHERE first_seen >= '2026-05-11'   -- TVK era only
GROUP BY DATE_TRUNC('day', first_seen)
ORDER BY day DESC;
