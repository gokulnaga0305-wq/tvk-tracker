-- 027: candidate-level profiles for Election Insights (P1.5, OBSERVED).
--
-- 4,023 candidates across 234 ACs with party/alliance, gender, age, education,
-- declared assets and criminal-case flag (from candidate affidavits in the
-- accessible feed). Powers candidate insights: criminal-case share, women
-- winners, asset distribution, age — per AC and rolled up by district.

CREATE TABLE IF NOT EXISTS election_candidates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ac_no       SMALLINT NOT NULL REFERENCES election_constituencies(ac_no),
    sl_no       SMALLINT,
    name        TEXT NOT NULL,
    party       TEXT,
    alliance    TEXT,                 -- spa | nda | tvk | ntk | others | independent
    gender      TEXT,
    age         SMALLINT,
    education   TEXT,
    profession  TEXT,
    symbol      TEXT,
    assets_text TEXT,                 -- raw declared assets, e.g. "₹7.57 Cr"
    assets_cr   NUMERIC(12,3),        -- parsed to crore for aggregation
    criminal    BOOLEAN DEFAULT FALSE,
    result      TEXT,                 -- won | lost
    UNIQUE (ac_no, sl_no, name)
);
CREATE INDEX IF NOT EXISTS idx_cand_ac     ON election_candidates (ac_no);
CREATE INDEX IF NOT EXISTS idx_cand_party  ON election_candidates (party);
CREATE INDEX IF NOT EXISTS idx_cand_result ON election_candidates (result);

ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY elec_cand_read  ON election_candidates FOR SELECT USING (true);
CREATE POLICY elec_cand_admin ON election_candidates FOR ALL USING (auth.role() = 'service_role');
