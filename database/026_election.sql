-- 026: Election Insights — 2026 TN Assembly election data.
--
-- Schema enforces the honesty spine (FACT_CHECK_PROTOCOL.md claim ladder):
--   OBSERVED data (results, turnout, electors) lives in election_constituencies
--   / election_ac_results / election_booth_results — stated as fact.
--   INFERRED data (how gender/age groups voted) lives ONLY in
--   election_demographics, which carries method + confidence band + source on
--   every row and is rendered as an explicit "estimate", never as a result.
--
-- P0/P1 populate constituencies + ac_results (AC-level, from the accessible
-- ECI-derived feed). P2 populates booth_results (Form 20). P3 populates
-- demographics via our own ecological inference off the booth layer.

-- ---- OBSERVED: the 234 Assembly Constituencies -------------------------------
CREATE TABLE IF NOT EXISTS election_constituencies (
    ac_no            SMALLINT PRIMARY KEY,          -- 1..234
    ac_name          TEXT NOT NULL,
    district         TEXT,
    category         TEXT,                          -- General | SC | ST
    electors         INTEGER,
    electors_male    INTEGER,
    electors_female  INTEGER,
    electors_third   INTEGER,
    candidates_count SMALLINT,
    winner_2021      TEXT,                           -- party/alliance that won in 2021
    winner_2026      TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- OBSERVED: AC-level results, per candidate, per year ---------------------
CREATE TABLE IF NOT EXISTS election_ac_results (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ac_no          SMALLINT NOT NULL REFERENCES election_constituencies(ac_no),
    year           SMALLINT NOT NULL,               -- 2026 | 2021 (for swing)
    candidate_name TEXT,
    party          TEXT,
    alliance       TEXT,                            -- TVK | SPA-DMK+ | NDA-ADMK+ | ...
    votes          INTEGER,
    vote_share     NUMERIC(5,2),
    rank           SMALLINT,
    is_winner      BOOLEAN DEFAULT FALSE,
    margin         INTEGER,                          -- winner only: votes over runner-up
    UNIQUE (ac_no, year, candidate_name, party)
);
CREATE INDEX IF NOT EXISTS idx_acres_ac_year ON election_ac_results (ac_no, year);
CREATE INDEX IF NOT EXISTS idx_acres_party   ON election_ac_results (party);

-- ---- OBSERVED: booth (polling-station) level — Form 20 (P2) ------------------
CREATE TABLE IF NOT EXISTS election_booth_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ac_no       SMALLINT NOT NULL REFERENCES election_constituencies(ac_no),
    booth_no    INTEGER NOT NULL,
    booth_name  TEXT,
    party       TEXT,
    candidate   TEXT,
    votes       INTEGER,
    total_electors INTEGER,
    total_polled   INTEGER,
    UNIQUE (ac_no, booth_no, party, candidate)
);
CREATE INDEX IF NOT EXISTS idx_booth_ac ON election_booth_results (ac_no, booth_no);

-- ---- INFERRED: demographic vote-splits (P3) — NOT a result -------------------
-- Every row is an ESTIMATE with a method, a confidence band, and a source.
-- The frontend renders this table behind an "Estimated — modeled, not official"
-- wall. Secret ballot: no official record exists of how a group voted.
CREATE TABLE IF NOT EXISTS election_demographics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope         TEXT NOT NULL DEFAULT 'state',     -- state | district | ac
    ac_no         SMALLINT REFERENCES election_constituencies(ac_no),
    district      TEXT,
    segment_type  TEXT NOT NULL,                     -- gender | age
    segment       TEXT NOT NULL,                     -- Male | Female | 18-25 | ...
    party         TEXT NOT NULL,
    est_share     NUMERIC(5,2) NOT NULL,             -- estimated vote share %
    ci_low        NUMERIC(5,2),                      -- confidence band
    ci_high       NUMERIC(5,2),
    method        TEXT NOT NULL,                     -- 'ecological_inference' | 'survey'
    source        TEXT,                              -- our model run / CSDS / Axis
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_demo_scope ON election_demographics (scope, segment_type);

-- ---- RLS: public read on everything (all election data is public) -----------
ALTER TABLE election_constituencies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_ac_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_booth_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_demographics    ENABLE ROW LEVEL SECURITY;

CREATE POLICY elec_const_read ON election_constituencies FOR SELECT USING (true);
CREATE POLICY elec_acres_read ON election_ac_results     FOR SELECT USING (true);
CREATE POLICY elec_booth_read ON election_booth_results  FOR SELECT USING (true);
CREATE POLICY elec_demo_read  ON election_demographics   FOR SELECT USING (true);

CREATE POLICY elec_const_admin ON election_constituencies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY elec_acres_admin ON election_ac_results     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY elec_booth_admin ON election_booth_results  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY elec_demo_admin  ON election_demographics   FOR ALL USING (auth.role() = 'service_role');
