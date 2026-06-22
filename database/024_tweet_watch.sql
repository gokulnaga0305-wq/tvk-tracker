-- 024: tweet_watch — review queue for watched DMK-defense / fact-check handles
--
-- @saysatheesh and a few similar accounts post a steady stream of credit-steal
-- call-outs and data rebuttals. X has no free API and Apify costs money, so we
-- poll the public Nitter RSS for these handles, dedup by tweet id, and FLAG the
-- ones whose text matches credit-steal / fact-check signals.
--
-- IMPORTANT: this is a REVIEW QUEUE, not an auto-publisher. Flagged rows sit at
-- status='new' until a human (or an in-session agent) does proper background
-- verification — exactly like the manual credit-steal adds — and only then
-- creates an incident/propaganda_event. Nothing here is ever shown publicly.

CREATE TABLE IF NOT EXISTS tweet_watch (
    tweet_id          TEXT PRIMARY KEY,         -- X status id (dedup key)
    handle            TEXT NOT NULL,            -- account polled (e.g. saysatheesh)
    author            TEXT,                     -- display author (RTs differ from handle)
    text              TEXT,                     -- tweet text (from Nitter title/desc)
    url               TEXT,                     -- canonical x.com/<h>/status/<id>
    posted_at         TIMESTAMPTZ,              -- tweet pubDate
    is_retweet        BOOLEAN DEFAULT false,

    -- Triage
    is_candidate      BOOLEAN DEFAULT false,    -- matched a credit-steal/fact signal
    matched_keywords  TEXT[]  DEFAULT '{}',     -- which signals fired (quick review)
    status            TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
        'new',          -- freshly captured, awaiting review
        'reviewed',     -- a human looked, not actionable
        'added',        -- verified + promoted to an incident/propaganda_event
        'dismissed'     -- not a real credit-steal / out of scope
    )),
    linked_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    review_note       TEXT,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tweetwatch_candidate ON tweet_watch (is_candidate, status);
CREATE INDEX IF NOT EXISTS idx_tweetwatch_posted    ON tweet_watch (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweetwatch_handle    ON tweet_watch (handle);

-- RLS: this is an internal review queue — service-role only, no public read.
ALTER TABLE tweet_watch ENABLE ROW LEVEL SECURITY;
CREATE POLICY tweetwatch_admin_all ON tweet_watch
    FOR ALL USING (auth.role() = 'service_role');
